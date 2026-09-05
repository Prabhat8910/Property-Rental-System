const Notification = require('../models/Notification');

// GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const notifications = await Notification.find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(50);
    const unreadCount = await Notification.countDocuments({ user_id: userId, is_read: false });
    res.json({ success: true, data: notifications, unreadCount });
  } catch (error) { next(error); }
};

// PUT /api/notifications/read-all
const markAllRead = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    await Notification.updateMany({ user_id: userId }, { $set: { is_read: true } });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) { next(error); }
};

// PUT /api/notifications/:id/read
const markRead = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    await Notification.findOneAndUpdate({ _id: req.params.id, user_id: userId }, { $set: { is_read: true } });
    res.json({ success: true });
  } catch (error) { next(error); }
};

module.exports = { getNotifications, markAllRead, markRead };
