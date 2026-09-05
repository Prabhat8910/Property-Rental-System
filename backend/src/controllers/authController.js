const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');

const generateToken = (userId) =>
  jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'tenant', phone } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const uuid = uuidv4();
    const assignedRole = role === 'admin' ? 'tenant' : role;

    const user = await User.create({
      uuid,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: assignedRole,
      phone,
      is_verified: true,
    });

    const token = generateToken(user._id);

    await sendEmail({
      to: email,
      subject: 'Welcome to Property Rental Platform',
      html: `<h2>Welcome, ${name}!</h2><p>Your account has been created successfully.</p>`,
    }).catch(() => {}); // don't fail if email fails

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: { id: user._id.toString(), uuid: user.uuid, name: user.name, email: user.email, role: user.role, phone: user.phone },
      },
    });
  } catch (error) { next(error); }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (!user.is_active) return res.status(401).json({ success: false, message: 'Account deactivated. Contact support.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = generateToken(user._id);
    const userObj = user.toJSON();
    delete userObj.password;

    res.json({
      success: true,
      message: 'Login successful',
      data: { token, user: userObj },
    });
  } catch (error) { next(error); }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id || req.user._id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};

// PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const avatar = req.file ? `/uploads/${req.file.filename}` : undefined;

    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (avatar) updates.avatar = avatar;

    if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: 'No fields to update' });

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id || req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, message: 'Profile updated', data: updatedUser });
  } catch (error) { next(error); }
};

// PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id || req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) { next(error); }
};

module.exports = { register, login, getMe, updateProfile, changePassword };
