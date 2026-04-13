const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');

// GET /api/properties - with filters
const getProperties = async (req, res, next) => {
  try {
    const { city, min_price, max_price, property_type, bedrooms, available, featured, page = 1, limit = 12, search } = req.query;
    const offset = (page - 1) * limit;

    let where = ['p.status = "active"'];
    const params = [];

    if (city) { where.push('p.city LIKE ?'); params.push(`%${city}%`); }
    if (min_price) { where.push('p.price >= ?'); params.push(min_price); }
    if (max_price) { where.push('p.price <= ?'); params.push(max_price); }
    if (property_type) { where.push('p.property_type = ?'); params.push(property_type); }
    if (bedrooms) { where.push('p.bedrooms >= ?'); params.push(bedrooms); }
    if (available === 'true') { where.push('p.is_available = TRUE'); }
    if (featured === 'true') { where.push('p.is_featured = TRUE'); }
    if (search) { where.push('(p.title LIKE ? OR p.location LIKE ? OR p.description LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [properties] = await pool.query(
      `SELECT p.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone
       FROM properties p
       JOIN users u ON p.owner_id = u.id
       ${whereClause}
       ORDER BY p.is_featured DESC, p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM properties p ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: properties,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (error) { next(error); }
};

// GET /api/properties/:id
const getProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [properties] = await pool.query(
      `SELECT p.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone, u.avatar as owner_avatar
       FROM properties p JOIN users u ON p.owner_id = u.id
       WHERE p.uuid = ? OR p.id = ?`,
      [id, id]
    );

    if (!properties.length) return res.status(404).json({ success: false, message: 'Property not found' });

    const property = properties[0];

    // Get reviews
    const [reviews] = await pool.query(
      `SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar
       FROM reviews r JOIN users u ON r.user_id = u.id
       WHERE r.property_id = ? AND r.is_approved = TRUE
       ORDER BY r.created_at DESC LIMIT 10`,
      [property.id]
    );

    // Check wishlist if authenticated
    let inWishlist = false;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [wl] = await pool.query('SELECT id FROM wishlists WHERE user_id = ? AND property_id = ?', [decoded.userId, property.id]);
        inWishlist = wl.length > 0;
      } catch {}
    }

    res.json({ success: true, data: { ...property, reviews, inWishlist } });
  } catch (error) { next(error); }
};

// POST /api/properties
const createProperty = async (req, res, next) => {
  try {
    const { title, description, location, city, state, country, zip_code, price, price_type, property_type, bedrooms, bathrooms, area_sqft, amenities, latitude, longitude } = req.body;
    const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

    const [result] = await pool.query(
      `INSERT INTO properties (uuid, owner_id, title, description, location, city, state, country, zip_code, price, price_type, property_type, bedrooms, bathrooms, area_sqft, amenities, images, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), req.user.id, title, description, location, city, state, country || 'India', zip_code, price, price_type || 'per_month', property_type || 'apartment', bedrooms || 1, bathrooms || 1, area_sqft, JSON.stringify(amenities || []), JSON.stringify(images), latitude, longitude]
    );

    const [newProperty] = await pool.query('SELECT * FROM properties WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Property created', data: newProperty[0] });
  } catch (error) { next(error); }
};

// PUT /api/properties/:id
const updateProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [properties] = await pool.query('SELECT * FROM properties WHERE uuid = ? OR id = ?', [id, id]);
    if (!properties.length) return res.status(404).json({ success: false, message: 'Property not found' });
    const property = properties[0];

    if (property.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const fields = ['title', 'description', 'location', 'city', 'state', 'price', 'property_type', 'bedrooms', 'bathrooms', 'area_sqft', 'is_available', 'status'];
    const updates = [];
    const values = [];

    fields.forEach(f => {
      if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
    });
    if (req.body.amenities) { updates.push('amenities = ?'); values.push(JSON.stringify(req.body.amenities)); }
    if (req.files?.length) { updates.push('images = ?'); values.push(JSON.stringify(req.files.map(f => `/uploads/${f.filename}`))); }

    if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });

    values.push(property.id);
    await pool.query(`UPDATE properties SET ${updates.join(', ')} WHERE id = ?`, values);

    const [updated] = await pool.query('SELECT * FROM properties WHERE id = ?', [property.id]);
    res.json({ success: true, message: 'Property updated', data: updated[0] });
  } catch (error) { next(error); }
};

// DELETE /api/properties/:id
const deleteProperty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [properties] = await pool.query('SELECT * FROM properties WHERE uuid = ? OR id = ?', [id, id]);
    if (!properties.length) return res.status(404).json({ success: false, message: 'Property not found' });

    if (properties[0].owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await pool.query('DELETE FROM properties WHERE id = ?', [properties[0].id]);
    res.json({ success: true, message: 'Property deleted' });
  } catch (error) { next(error); }
};

// GET /api/properties/owner/my-properties
const getMyProperties = async (req, res, next) => {
  try {
    const [properties] = await pool.query(
      `SELECT p.*, 
        (SELECT COUNT(*) FROM bookings WHERE property_id = p.id AND status IN ('confirmed','completed')) as total_bookings,
        (SELECT COUNT(*) FROM bookings WHERE property_id = p.id AND status = 'confirmed') as active_bookings,
        (SELECT COALESCE(SUM(amount),0) FROM payments pay JOIN bookings b ON pay.booking_id = b.id WHERE b.property_id = p.id AND pay.status = 'completed') as total_revenue
       FROM properties p WHERE p.owner_id = ? ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: properties });
  } catch (error) { next(error); }
};

// POST /api/properties/:id/wishlist
const toggleWishlist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [properties] = await pool.query('SELECT id FROM properties WHERE uuid = ? OR id = ?', [id, id]);
    if (!properties.length) return res.status(404).json({ success: false, message: 'Property not found' });

    const propertyId = properties[0].id;
    const [existing] = await pool.query('SELECT id FROM wishlists WHERE user_id = ? AND property_id = ?', [req.user.id, propertyId]);

    if (existing.length) {
      await pool.query('DELETE FROM wishlists WHERE user_id = ? AND property_id = ?', [req.user.id, propertyId]);
      return res.json({ success: true, message: 'Removed from wishlist', inWishlist: false });
    } else {
      await pool.query('INSERT INTO wishlists (user_id, property_id) VALUES (?, ?)', [req.user.id, propertyId]);
      return res.json({ success: true, message: 'Added to wishlist', inWishlist: true });
    }
  } catch (error) { next(error); }
};

module.exports = { getProperties, getProperty, createProperty, updateProperty, deleteProperty, getMyProperties, toggleWishlist };
