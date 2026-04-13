const { pool } = require('../config/database');

// GET /api/admin/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const [[users]] = await pool.query('SELECT COUNT(*) as total, SUM(role="owner") as owners, SUM(role="tenant") as tenants FROM users WHERE role != "admin"');
    const [[properties]] = await pool.query('SELECT COUNT(*) as total, SUM(is_available) as available, SUM(status="active") as active FROM properties');
    const [[bookings]] = await pool.query('SELECT COUNT(*) as total, SUM(status="confirmed") as confirmed, SUM(status="pending") as pending FROM bookings');
    const [[payments]] = await pool.query('SELECT COUNT(*) as total, COALESCE(SUM(amount),0) as revenue FROM payments WHERE status="completed"');
    const [[maintenance]] = await pool.query('SELECT COUNT(*) as total, SUM(status="open") as open, SUM(status="in_progress") as in_progress FROM maintenance_requests');

    const [recentBookings] = await pool.query(
      `SELECT b.*, p.title as property_title, u.name as tenant_name FROM bookings b JOIN properties p ON b.property_id = p.id JOIN users u ON b.tenant_id = u.id ORDER BY b.created_at DESC LIMIT 5`
    );

    const [monthlyRevenue] = await pool.query(
      `SELECT DATE_FORMAT(payment_date, '%Y-%m') as month, SUM(amount) as revenue, COUNT(*) as transactions
       FROM payments WHERE status = 'completed' AND payment_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY month ORDER BY month ASC`
    );

    res.json({
      success: true,
      data: { users, properties, bookings, payments, maintenance, recentBookings, monthlyRevenue }
    });
  } catch (error) { next(error); }
};

// GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    let where = ['role != "admin"'];
    const params = [];
    if (role) { where.push('role = ?'); params.push(role); }
    if (search) { where.push('(name LIKE ? OR email LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    const whereClause = `WHERE ${where.join(' AND ')}`;

    const [users] = await pool.query(`SELECT id, uuid, name, email, role, phone, is_active, is_verified, created_at FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, parseInt(limit), parseInt(offset)]);
    const [count] = await pool.query(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
    res.json({ success: true, data: users, pagination: { total: count[0].total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) { next(error); }
};

// PUT /api/admin/users/:id/toggle
const toggleUser = async (req, res, next) => {
  try {
    const [users] = await pool.query('SELECT id, is_active FROM users WHERE id = ?', [req.params.id]);
    if (!users.length) return res.status(404).json({ success: false, message: 'User not found' });
    const newStatus = !users[0].is_active;
    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, req.params.id]);
    res.json({ success: true, message: `User ${newStatus ? 'activated' : 'deactivated'}` });
  } catch (error) { next(error); }
};

// GET /api/admin/properties
const getAllProperties = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const where = status ? `WHERE p.status = '${status}'` : '';
    const [properties] = await pool.query(`SELECT p.*, u.name as owner_name FROM properties p JOIN users u ON p.owner_id = u.id ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`, [parseInt(limit), parseInt(offset)]);
    const [count] = await pool.query(`SELECT COUNT(*) as total FROM properties p ${where}`);
    res.json({ success: true, data: properties, pagination: { total: count[0].total } });
  } catch (error) { next(error); }
};

module.exports = { getDashboard, getUsers, toggleUser, getAllProperties };
