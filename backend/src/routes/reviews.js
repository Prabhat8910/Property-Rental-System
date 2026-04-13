const express = require('express');
const { body } = require('express-validator');
const { createReview, getPropertyReviews } = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');

const router = express.Router();

router.get('/property/:propertyId', getPropertyReviews);
router.post('/', authenticate, authorize('tenant'), [
  body('property_id').notEmpty(),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
], validateRequest, createReview);

module.exports = router;
