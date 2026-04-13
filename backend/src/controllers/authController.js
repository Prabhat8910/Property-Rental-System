const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { sendEmail } = require('../utils/email');

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'tenant', phone } = req.body;

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ success: false, message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const uuid = uuidv4();

    const [result] = await pool.query(
      `INSERT INTO users (uuid, name, email, password, role, phone, is_verified) VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [uuid, name, email, hashedPassword, role === 'admin' ? 'tenant' : role, phone]
    );

    const token = generateToken(result.insertId);

    await sendEmail({
      to: email,
      subject: 'Welcome to Property Rental Platform',
      html: `<h2>Welcome, ${name}!</h2><p>Your account has been created successfully.</p>`,
    }).catch(() => {}); // don't fail if email fails

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { token, user: { id: result.insertId, uuid, name, email, role: role === 'admin' ? 'tenant' : role, phone } },
    });
  } catch (error) { next(error); }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const [users] = await pool.query(
      'SELECT id, uuid, name, email, password, role, phone, avatar, is_active FROM users WHERE email = ?',
      [email]
    );

    if (!users.length) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const user = users[0];

    if (!user.is_active) return res.status(401).json({ success: false, message: 'Account deactivated. Contact support.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = generateToken(user.id);
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: { token, user: userWithoutPassword },
    });
  } catch (error) { next(error); }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT id, uuid, name, email, role, phone, avatar, is_verified, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json({ success: true, data: users[0] });
  } catch (error) { next(error); }
};

// PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const avatar = req.file ? `/uploads/${req.file.filename}` : undefined;

    const updates = [];
    const values = [];
    if (name) { updates.push('name = ?'); values.push(name); }
    if (phone) { updates.push('phone = ?'); values.push(phone); }
    if (avatar) { updates.push('avatar = ?'); values.push(avatar); }

    if (!updates.length) return res.status(400).json({ success: false, message: 'No fields to update' });

    values.push(req.user.id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    const [updated] = await pool.query(
      'SELECT id, uuid, name, email, role, phone, avatar FROM users WHERE id = ?',
      [req.user.id]
    );
    res.json({ success: true, message: 'Profile updated', data: updated[0] });
  } catch (error) { next(error); }
};

// PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, users[0].password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) { next(error); }
};

module.exports = { register, login, getMe, updateProfile, changePassword };
