const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { createNotification } = require('../utils/notification');

// POST /api/maintenance
const createRequest = async (req, res, next) => {
  try {
    const { property_id, title, description, category, priority } = req.body;
    const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

    const [properties] = await pool.query('SELECT id, owner_id, title FROM properties WHERE uuid = ? OR id = ?', [property_id, property_id]);
    if (!properties.length) return res.status(404).json({ success: false, message: 'Property not found' });

    const [result] = await pool.query(
      `INSERT INTO maintenance_requests (uuid, property_id, tenant_id, title, description, category, priority, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), properties[0].id, req.user.id, title, description, category || 'other', priority || 'medium', JSON.stringify(images)]
    );

    await createNotification(properties[0].owner_id, 'New Maintenance Request', `New ${priority || 'medium'} priority request: "${title}"`, 'maintenance', result.insertId);

    const [request] = await pool.query('SELECT * FROM maintenance_requests WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Maintenance request submitted', data: request[0] });
  } catch (error) { next(error); }
};

// GET /api/maintenance
const getRequests = async (req, res, next) => {
  try {
    const { status, priority, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const { role, id } = req.user;

    let where = [];
    const params = [];

    if (role === 'tenant') { where.push('mr.tenant_id = ?'); params.push(id); }
    else if (role === 'owner') { where.push('p.owner_id = ?'); params.push(id); }
    if (status) { where.push('mr.status = ?'); params.push(status); }
    if (priority) { where.push('mr.priority = ?'); params.push(priority); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [requests] = await pool.query(
      `SELECT mr.*, p.title as property_title, p.location, u.name as tenant_name, u.email as tenant_email
       FROM maintenance_requests mr
       JOIN properties p ON mr.property_id = p.id
       JOIN users u ON mr.tenant_id = u.id
       ${whereClause}
       ORDER BY FIELD(mr.priority, 'urgent','high','medium','low'), mr.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const [count] = await pool.query(`SELECT COUNT(*) as total FROM maintenance_requests mr JOIN properties p ON mr.property_id = p.id ${whereClause}`, params);

    res.json({ success: true, data: requests, pagination: { total: count[0].total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) { next(error); }
};

// PUT /api/maintenance/:id
const updateRequest = async (req, res, next) => {
  try {
    const { status, owner_notes } = req.body;
    const [requests] = await pool.query(
      `SELECT mr.*, p.owner_id FROM maintenance_requests mr JOIN properties p ON mr.property_id = p.id WHERE mr.uuid = ? OR mr.id = ?`,
      [req.params.id, req.params.id]
    );
    if (!requests.length) return res.status(404).json({ success: false, message: 'Request not found' });
    const request = requests[0];

    if (req.user.role === 'owner' && request.owner_id !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied' });

    const updates = [];
    const values = [];
    if (status) {
      updates.push('status = ?'); values.push(status);
      if (status === 'resolved') { updates.push('resolved_at = NOW()'); }
    }
    if (owner_notes !== undefined) { updates.push('owner_notes = ?'); values.push(owner_notes); }

    if (!updates.length) return res.status(400).json({ success: false, message: 'Nothing to update' });

    values.push(request.id);
    await pool.query(`UPDATE maintenance_requests SET ${updates.join(', ')} WHERE id = ?`, values);

    await createNotification(request.tenant_id, 'Maintenance Update', `Your maintenance request "${request.title}" status changed to ${status}`, 'maintenance', request.id);

    res.json({ success: true, message: 'Request updated' });
  } catch (error) { next(error); }
};

module.exports = { createRequest, getRequests, updateRequest };
