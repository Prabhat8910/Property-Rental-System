const { pool } = require('../config/database');

const createNotification = async (userId, title, message, type = 'system', referenceId = null) => {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, title, message, type, reference_id) VALUES (?, ?, ?, ?, ?)',
      [userId, title, message, type, referenceId]
    );
  } catch (error) {
    console.error('Notification creation error:', error.message);
  }
};

module.exports = { createNotification };
