const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { createNotification } = require('../utils/notification');

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe not configured');
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
};

// POST /api/payments/create-intent
const createPaymentIntent = async (req, res, next) => {
  try {
    const { booking_id } = req.body;
    const stripe = getStripe();

    const [bookings] = await pool.query(
      `SELECT b.*, p.title, p.owner_id FROM bookings b JOIN properties p ON b.property_id = p.id WHERE b.uuid = ? OR b.id = ?`,
      [booking_id, booking_id]
    );
    if (!bookings.length) return res.status(404).json({ success: false, message: 'Booking not found' });
    const booking = bookings[0];

    if (booking.tenant_id !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied' });
    if (booking.status === 'cancelled') return res.status(400).json({ success: false, message: 'Cannot pay for a cancelled booking' });

    const [existingPayment] = await pool.query('SELECT id FROM payments WHERE booking_id = ? AND status = "completed"', [booking.id]);
    if (existingPayment.length) return res.status(400).json({ success: false, message: 'Booking already paid' });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.total_amount * 100), // paise/cents
      currency: 'inr',
      metadata: { booking_id: booking.id.toString(), tenant_id: req.user.id.toString() },
    });

    // Create pending payment record
    await pool.query(
      `INSERT INTO payments (uuid, booking_id, tenant_id, amount, stripe_payment_intent_id, status) VALUES (?, ?, ?, ?, ?, 'pending')
       ON DUPLICATE KEY UPDATE stripe_payment_intent_id = VALUES(stripe_payment_intent_id)`,
      [uuidv4(), booking.id, req.user.id, booking.total_amount, paymentIntent.id]
    );

    res.json({ success: true, data: { clientSecret: paymentIntent.client_secret, amount: booking.total_amount } });
  } catch (error) { next(error); }
};

// POST /api/payments/confirm
const confirmPayment = async (req, res, next) => {
  try {
    const { payment_intent_id } = req.body;
    const stripe = getStripe();

    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (paymentIntent.status !== 'succeeded') return res.status(400).json({ success: false, message: 'Payment not successful' });

    await pool.query(
      `UPDATE payments SET status = 'completed', payment_date = NOW() WHERE stripe_payment_intent_id = ?`,
      [payment_intent_id]
    );
    await pool.query(
      `UPDATE bookings SET status = 'confirmed' WHERE id = ?`,
      [paymentIntent.metadata.booking_id]
    );

    const [bookings] = await pool.query(
      `SELECT b.*, p.title, p.owner_id FROM bookings b JOIN properties p ON b.property_id = p.id WHERE b.id = ?`,
      [paymentIntent.metadata.booking_id]
    );
    if (bookings.length) {
      await createNotification(bookings[0].owner_id, 'Payment Received', `Payment received for booking of "${bookings[0].title}"`, 'payment', bookings[0].id);
    }

    res.json({ success: true, message: 'Payment confirmed and booking activated' });
  } catch (error) { next(error); }
};

// POST /api/payments/webhook (Stripe webhook)
const stripeWebhook = async (req, res, next) => {
  try {
    const stripe = getStripe();
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).json({ message: `Webhook error: ${err.message}` });
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      await pool.query(`UPDATE payments SET status = 'completed', payment_date = NOW() WHERE stripe_payment_intent_id = ?`, [pi.id]);
      await pool.query(`UPDATE bookings SET status = 'confirmed' WHERE id = ?`, [pi.metadata.booking_id]);
    }

    res.json({ received: true });
  } catch (error) { next(error); }
};

// GET /api/payments/history
const getPaymentHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const { role, id } = req.user;

    let where = role === 'tenant' ? `WHERE pay.tenant_id = ${id}` : role === 'owner' ? `WHERE p.owner_id = ${id}` : '';

    const [payments] = await pool.query(
      `SELECT pay.*, b.check_in, b.check_out, p.title as property_title, p.location, u.name as tenant_name
       FROM payments pay
       JOIN bookings b ON pay.booking_id = b.id
       JOIN properties p ON b.property_id = p.id
       JOIN users u ON pay.tenant_id = u.id
       ${where}
       ORDER BY pay.created_at DESC LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );

    const [count] = await pool.query(`SELECT COUNT(*) as total FROM payments pay JOIN bookings b ON pay.booking_id = b.id JOIN properties p ON b.property_id = p.id ${where}`);

    res.json({ success: true, data: payments, pagination: { total: count[0].total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) { next(error); }
};

module.exports = { createPaymentIntent, confirmPayment, stripeWebhook, getPaymentHistory };
