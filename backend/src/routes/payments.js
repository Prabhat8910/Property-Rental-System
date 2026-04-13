const express = require('express');
const { createPaymentIntent, confirmPayment, stripeWebhook, getPaymentHistory } = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Stripe webhook needs raw body
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

router.post('/create-intent', authenticate, createPaymentIntent);
router.post('/confirm', authenticate, confirmPayment);
router.get('/history', authenticate, getPaymentHistory);

module.exports = router;
