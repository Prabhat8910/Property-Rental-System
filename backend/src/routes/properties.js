const express = require('express');
const { body } = require('express-validator');
const { getProperties, getProperty, createProperty, updateProperty, deleteProperty, getMyProperties, toggleWishlist } = require('../controllers/propertyController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', getProperties);
router.get('/my-properties', authenticate, authorize('owner'), getMyProperties);
router.get('/:id', getProperty);

router.post('/', authenticate, authorize('owner', 'admin'), upload.array('images', 10), [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('location').trim().notEmpty().withMessage('Location required'),
  body('city').trim().notEmpty().withMessage('City required'),
  body('price').isNumeric().withMessage('Valid price required'),
], validateRequest, createProperty);

router.put('/:id', authenticate, authorize('owner', 'admin'), upload.array('images', 10), updateProperty);
router.delete('/:id', authenticate, authorize('owner', 'admin'), deleteProperty);
router.post('/:id/wishlist', authenticate, toggleWishlist);

module.exports = router;
