const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { sendEmail } = require('../utils/email');
const { createNotification } = require('../utils/notification');

// POST /api/bookings
const createBooking = async (req, res, next) => {
  try {
    const { property_id, check_in, check_out, notes } = req.body;

    // Get property
    const [properties] = await pool.query('SELECT * FROM properties WHERE uuid = ? OR id = ?', [property_id, property_id]);
    if (!properties.length) return res.status(404).json({ success: false, message: 'Property not found' });
    const property = properties[0];

    if (!property.is_available) return res.status(400).json({ success: false, message: 'Property is not available' });
    if (property.owner_id === req.user.id) return res.status(400).json({ success: false, message: 'Owners cannot book their own property' });

    // Validate dates
    const checkIn = new Date(check_in);
    const checkOut = new Date(check_out);
    if (checkIn >= checkOut) return res.status(400).json({ success: false, message: 'Check-out must be after check-in' });
    if (checkIn < new Date()) return res.status(400).json({ success: false, message: 'Check-in cannot be in the past' });

    // Check for overlapping bookings
    const [conflicts] = await pool.query(
      `SELECT id FROM bookings 
       WHERE property_id = ? AND status IN ('pending', 'confirmed')
       AND NOT (check_out <= ? OR check_in >= ?)`,
      [property.id, check_in, check_out]
    );

    if (conflicts.length) return res.status(409).json({ success: false, message: 'Property already booked for selected dates' });

    // Calculate total
    const totalDays = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    let totalAmount;
    if (property.price_type === 'per_month') {
      totalAmount = (property.price / 30) * totalDays;
    } else if (property.price_type === 'per_week') {
      totalAmount = (property.price / 7) * totalDays;
    } else {
      totalAmount = property.price * totalDays;
    }

    const [result] = await pool.query(
      `INSERT INTO bookings (uuid, tenant_id, property_id, check_in, check_out, total_days, total_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), req.user.id, property.id, check_in, check_out, totalDays, totalAmount.toFixed(2), notes]
    );

    const [booking] = await pool.query('SELECT * FROM bookings WHERE id = ?', [result.insertId]);

    // Notify owner
    await createNotification(property.owner_id, 'New Booking Request', `${req.user.name} has requested to book "${property.title}"`, 'booking', result.insertId);

    res.status(201).json({ success: true, message: 'Booking created', data: booking[0] });
  } catch (error) { next(error); }
};

// GET /api/bookings (tenant: own bookings, owner: their property bookings, admin: all)
const getBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const { role, id } = req.user;

    let where = [];
    const params = [];

    if (role === 'tenant') { where.push('b.tenant_id = ?'); params.push(id); }
    else if (role === 'owner') { where.push('p.owner_id = ?'); params.push(id); }
    if (status) { where.push('b.status = ?'); params.push(status); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [bookings] = await pool.query(
      `SELECT b.*, 
        p.title as property_title, p.location as property_location, p.images as property_images,
        u.name as tenant_name, u.email as tenant_email, u.phone as tenant_phone,
        pay.status as payment_status, pay.stripe_payment_intent_id
       FROM bookings b
       JOIN properties p ON b.property_id = p.id
       JOIN users u ON b.tenant_id = u.id
       LEFT JOIN payments pay ON pay.booking_id = b.id AND pay.status = 'completed'
       ${whereClause}
       ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [countResult] = await pool.query(`SELECT COUNT(*) as total FROM bookings b JOIN properties p ON b.property_id = p.id ${whereClause}`, params);

    res.json({ success: true, data: bookings, pagination: { total: countResult[0].total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(countResult[0].total / limit) } });
  } catch (error) { next(error); }
};

// GET /api/bookings/:id
const getBooking = async (req, res, next) => {
  try {
    const [bookings] = await pool.query(
      `SELECT b.*, p.title as property_title, p.location, p.images, p.price, p.owner_id,
        u.name as tenant_name, u.email as tenant_email, u.phone as tenant_phone,
        o.name as owner_name, o.email as owner_email
       FROM bookings b
       JOIN properties p ON b.property_id = p.id
       JOIN users u ON b.tenant_id = u.id
       JOIN users o ON p.owner_id = o.id
       WHERE b.uuid = ? OR b.id = ?`,
      [req.params.id, req.params.id]
    );
    if (!bookings.length) return res.status(404).json({ success: false, message: 'Booking not found' });
    const booking = bookings[0];

    if (req.user.role === 'tenant' && booking.tenant_id !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied' });
    if (req.user.role === 'owner' && booking.owner_id !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied' });

    res.json({ success: true, data: booking });
  } catch (error) { next(error); }
};

// PUT /api/bookings/:id/status
const updateBookingStatus = async (req, res, next) => {
  try {
    const { status, cancellation_reason } = req.body;
    const [bookings] = await pool.query(
      `SELECT b.*, p.owner_id, p.title FROM bookings b JOIN properties p ON b.property_id = p.id WHERE b.uuid = ? OR b.id = ?`,
      [req.params.id, req.params.id]
    );
    if (!bookings.length) return res.status(404).json({ success: false, message: 'Booking not found' });
    const booking = bookings[0];

    // Permission check
    const { role, id } = req.user;
    if (role === 'owner' && booking.owner_id !== id && !['confirmed', 'rejected'].includes(status)) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (role === 'tenant' && booking.tenant_id !== id && status !== 'cancelled') return res.status(403).json({ success: false, message: 'Not authorized' });

    await pool.query('UPDATE bookings SET status = ?, cancellation_reason = ? WHERE id = ?', [status, cancellation_reason || null, booking.id]);

    // Notify
    const notifyUserId = role === 'owner' ? booking.tenant_id : booking.owner_id;
    await createNotification(notifyUserId, 'Booking Status Updated', `Your booking for "${booking.title}" is now ${status}`, 'booking', booking.id);

    res.json({ success: true, message: 'Booking status updated' });
  } catch (error) { next(error); }
};

// GET /api/bookings/availability/:propertyId
const getAvailability = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const [bookedDates] = await pool.query(
      `SELECT check_in, check_out FROM bookings WHERE property_id = ? AND status IN ('pending', 'confirmed')`,
      [propertyId]
    );
    res.json({ success: true, data: bookedDates });
  } catch (error) { next(error); }
};

module.exports = { createBooking, getBookings, getBooking, updateBookingStatus, getAvailability };
