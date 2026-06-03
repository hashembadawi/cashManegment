const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    const user = await User.findOne({ username: normalizedUsername });

    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(String(password), user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      {
        sub: user._id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to login.' });
  }
});

router.get('/auth/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({}, { username: 1, role: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch users.' });
  }
});

router.post('/auth/users', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { username, password, role = 'user' } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    if (normalizedUsername.length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Role must be user or admin.' });
    }

    const exists = await User.findOne({ username: normalizedUsername });
    if (exists) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      username: normalizedUsername,
      passwordHash,
      role,
    });

    return res.status(201).json({
      id: user._id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Username already exists.' });
    }
    return res.status(500).json({ message: 'Failed to create user.' });
  }
});

module.exports = router;
