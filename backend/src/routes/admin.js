const express = require('express');
const { getDashboard, getUsers, toggleUser, getAllProperties } = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/users', getUsers);
router.put('/users/:id/toggle', toggleUser);
router.get('/properties', getAllProperties);

module.exports = router;
