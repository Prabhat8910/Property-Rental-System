// bookings.js
const express = require('express');
const { body } = require('express-validator');
const { createBooking, getBookings, getBooking, updateBookingStatus, getAvailability } = require('../controllers/bookingController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/', authenticate, getBookings);
router.get('/availability/:propertyId', getAvailability);
router.get('/:id', authenticate, getBooking);

router.post('/', authenticate, authorize('tenant'), [
  body('property_id').notEmpty().withMessage('Property ID required'),
  body('check_in').isDate().withMessage('Valid check-in date required'),
  body('check_out').isDate().withMessage('Valid check-out date required'),
], validateRequest, createBooking);

router.put('/:id/status', authenticate, [
  body('status').isIn(['confirmed', 'rejected', 'cancelled', 'completed']).withMessage('Invalid status'),
], validateRequest, updateBookingStatus);

module.exports = router;
