const express = require('express');
const { getNotifications, markAllRead, markRead } = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, getNotifications);
router.put('/read-all', authenticate, markAllRead);
router.put('/:id/read', authenticate, markRead);

module.exports = router;
