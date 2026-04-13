const { pool } = require('../config/database');

// GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const [notifications] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    const [unread] = await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE', [req.user.id]);
    res.json({ success: true, data: notifications, unreadCount: unread[0].count });
  } catch (error) { next(error); }
};

// PUT /api/notifications/read-all
const markAllRead = async (req, res, next) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) { next(error); }
};

// PUT /api/notifications/:id/read
const markRead = async (req, res, next) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) { next(error); }
};

module.exports = { getNotifications, markAllRead, markRead };
