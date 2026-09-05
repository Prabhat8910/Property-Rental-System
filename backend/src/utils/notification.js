const Notification = require('../models/Notification');

const createNotification = async (userId, title, message, type = 'system', referenceId = null) => {
  try {
    await Notification.create({
      user_id: userId,
      title,
      message,
      type,
      reference_id: referenceId,
    });
  } catch (error) {
    console.error('Notification creation error:', error.message);
  }
};

module.exports = { createNotification };
