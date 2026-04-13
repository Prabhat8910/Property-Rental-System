const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe, updateProfile, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['owner', 'tenant']).withMessage('Role must be owner or tenant'),
], validateRequest, register);

router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
], validateRequest, login);

router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, upload.single('avatar'), updateProfile);
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
], validateRequest, changePassword);

module.exports = router;
