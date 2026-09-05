const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User = require('../models/User');
const { createNotification } = require('../utils/notification');
const { findBookingByIdOrUuid } = require('./bookingController');

const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes('your_stripe_secret_key') || key === 'sk_test_xxxxx') {
    return null;
  }
  try {
    return require('stripe')(key);
  } catch (err) {
    return null;
  }
};

// POST /api/payments/create-intent
const createPaymentIntent = async (req, res, next) => {
  try {
    const { booking_id } = req.body;
    const stripe = getStripe();

    const booking = await findBookingByIdOrUuid(booking_id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const tenantIdStr = (req.user.id || req.user._id).toString();
    if (booking.tenant_id.toString() !== tenantIdStr) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot pay for a cancelled booking' });
    }

    const existingPayment = await Payment.findOne({ booking_id: booking._id, status: 'completed' });
    if (existingPayment) {
      return res.status(400).json({ success: false, message: 'Booking already paid' });
    }

    let clientSecret = null;
    let paymentIntentId = null;

    if (stripe) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(booking.total_amount * 100), // paise/cents
          currency: 'inr',
          metadata: { booking_id: booking._id.toString(), tenant_id: tenantIdStr },
        });
        clientSecret = paymentIntent.client_secret;
        paymentIntentId = paymentIntent.id;
      } catch (stripeErr) {
        console.warn('Stripe API error, using mock payment fallback:', stripeErr.message);
        paymentIntentId = `mock_pi_${uuidv4()}`;
        clientSecret = `${paymentIntentId}_secret_mock`;
      }
    } else {
      paymentIntentId = `mock_pi_${uuidv4()}`;
      clientSecret = `${paymentIntentId}_secret_mock`;
    }

    // Save pending payment record
    await Payment.findOneAndUpdate(
      { booking_id: booking._id },
      {
        uuid: uuidv4(),
        booking_id: booking._id,
        tenant_id: req.user.id || req.user._id,
        amount: booking.total_amount,
        stripe_payment_intent_id: paymentIntentId,
        status: 'pending',
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: {
        clientSecret,
        paymentIntentId,
        isMock: paymentIntentId.startsWith('mock_pi_'),
        amount: booking.total_amount,
      },
    });
  } catch (error) { next(error); }
};

// POST /api/payments/confirm
const confirmPayment = async (req, res, next) => {
  try {
    const { payment_intent_id } = req.body;
    const stripe = getStripe();

    if (payment_intent_id && payment_intent_id.startsWith('mock_pi_')) {
      const payment = await Payment.findOneAndUpdate(
        { stripe_payment_intent_id: payment_intent_id },
        { status: 'completed', payment_date: new Date() },
        { new: true }
      );

      if (payment) {
        const booking = await Booking.findByIdAndUpdate(payment.booking_id, { status: 'confirmed' }, { new: true }).populate('property_id');
        if (booking && booking.property_id) {
          await createNotification(booking.property_id.owner_id, 'Payment Received', `Payment received for booking of "${booking.property_id.title}"`, 'payment', booking._id);
        }
      }
      return res.json({ success: true, message: 'Payment confirmed and booking activated' });
    }

    if (stripe) {
      const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
      if (paymentIntent.status !== 'succeeded') return res.status(400).json({ success: false, message: 'Payment not successful' });

      await Payment.findOneAndUpdate(
        { stripe_payment_intent_id: payment_intent_id },
        { status: 'completed', payment_date: new Date() }
      );

      const bookingId = paymentIntent.metadata.booking_id;
      const booking = await Booking.findByIdAndUpdate(bookingId, { status: 'confirmed' }, { new: true }).populate('property_id');
      if (booking && booking.property_id) {
        await createNotification(booking.property_id.owner_id, 'Payment Received', `Payment received for booking of "${booking.property_id.title}"`, 'payment', booking._id);
      }

      return res.json({ success: true, message: 'Payment confirmed and booking activated' });
    }

    // Fallback confirm
    const payment = await Payment.findOneAndUpdate(
      { stripe_payment_intent_id: payment_intent_id },
      { status: 'completed', payment_date: new Date() },
      { new: true }
    );
    if (payment) {
      await Booking.findByIdAndUpdate(payment.booking_id, { status: 'confirmed' });
    }

    return res.json({ success: true, message: 'Payment confirmed and booking activated' });
  } catch (error) { next(error); }
};

// POST /api/payments/webhook
const stripeWebhook = async (req, res, next) => {
  try {
    const stripe = getStripe();
    if (!stripe) return res.json({ received: true });

    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).json({ message: `Webhook error: ${err.message}` });
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      await Payment.findOneAndUpdate({ stripe_payment_intent_id: pi.id }, { status: 'completed', payment_date: new Date() });
      if (pi.metadata?.booking_id) {
        await Booking.findByIdAndUpdate(pi.metadata.booking_id, { status: 'confirmed' });
      }
    }

    res.json({ received: true });
  } catch (error) { next(error); }
};

// GET /api/payments/history
const getPaymentHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    const { role } = req.user;
    const userId = req.user.id || req.user._id;

    const filter = {};
    if (role === 'tenant') {
      filter.tenant_id = userId;
    } else if (role === 'owner') {
      const ownerProperties = await Property.find({ owner_id: userId }).select('_id');
      const ownerPropertyIds = ownerProperties.map((p) => p._id);
      const ownerBookings = await Booking.find({ property_id: { $in: ownerPropertyIds } }).select('_id');
      const bookingIds = ownerBookings.map((b) => b._id);
      filter.booking_id = { $in: bookingIds };
    }

    const payments = await Payment.find(filter)
      .populate({
        path: 'booking_id',
        select: 'check_in check_out property_id',
        populate: { path: 'property_id', select: 'title location' },
      })
      .populate('tenant_id', 'name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Payment.countDocuments(filter);

    const formattedPayments = payments.map((p) => {
      const obj = p.toJSON();
      if (p.booking_id && typeof p.booking_id === 'object') {
        if (p.booking_id.check_in) obj.check_in = p.booking_id.check_in.toISOString().split('T')[0];
        if (p.booking_id.check_out) obj.check_out = p.booking_id.check_out.toISOString().split('T')[0];
        if (p.booking_id.property_id && typeof p.booking_id.property_id === 'object') {
          obj.property_title = p.booking_id.property_id.title;
          obj.location = p.booking_id.property_id.location;
        }
      }
      if (p.tenant_id && typeof p.tenant_id === 'object') {
        obj.tenant_name = p.tenant_id.name;
      }
      return obj;
    });

    res.json({
      success: true,
      data: formattedPayments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) { next(error); }
};

module.exports = { createPaymentIntent, confirmPayment, stripeWebhook, getPaymentHistory };
