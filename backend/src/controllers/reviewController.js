const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');

// POST /api/reviews
const createReview = async (req, res, next) => {
  try {
    const { property_id, booking_id, rating, comment } = req.body;

    const [properties] = await pool.query('SELECT id FROM properties WHERE uuid = ? OR id = ?', [property_id, property_id]);
    if (!properties.length) return res.status(404).json({ success: false, message: 'Property not found' });
    const propId = properties[0].id;

    if (booking_id) {
      const [bookings] = await pool.query('SELECT id, status FROM bookings WHERE id = ? AND tenant_id = ? AND property_id = ?', [booking_id, req.user.id, propId]);
      if (!bookings.length) return res.status(400).json({ success: false, message: 'Invalid booking' });
      if (!['completed', 'confirmed'].includes(bookings[0].status)) return res.status(400).json({ success: false, message: 'Can only review confirmed/completed bookings' });
    }

    const [result] = await pool.query(
      `INSERT INTO reviews (uuid, user_id, property_id, booking_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), req.user.id, propId, booking_id || null, rating, comment]
    );

    // Update property avg rating
    await pool.query(
      `UPDATE properties SET avg_rating = (SELECT AVG(rating) FROM reviews WHERE property_id = ?), total_reviews = (SELECT COUNT(*) FROM reviews WHERE property_id = ?) WHERE id = ?`,
      [propId, propId, propId]
    );

    const [review] = await pool.query('SELECT r.*, u.name as reviewer_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Review submitted', data: review[0] });
  } catch (error) { next(error); }
};

// GET /api/reviews/property/:propertyId
const getPropertyReviews = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const [reviews] = await pool.query(
      `SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar
       FROM reviews r JOIN users u ON r.user_id = u.id
       WHERE r.property_id = ? AND r.is_approved = TRUE
       ORDER BY r.created_at DESC`,
      [propertyId]
    );
    const [stats] = await pool.query('SELECT AVG(rating) as avg, COUNT(*) as total FROM reviews WHERE property_id = ? AND is_approved = TRUE', [propertyId]);
    res.json({ success: true, data: reviews, stats: stats[0] });
  } catch (error) { next(error); }
};

module.exports = { createReview, getPropertyReviews };
