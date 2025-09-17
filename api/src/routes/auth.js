const router = require('express').Router();
const bcrypt = require('bcrypt');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const { signToken } = require('../middleware/auth');
const crypto = require('crypto');

// In-memory store for reset tokens (use Redis/DB for production)
const resetTokens = {};

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: User registered
 *       400:
 *         description: Missing fields
 *       409:
 *         description: User exists
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [emailOrUsername, password]
 *             properties:
 *               emailOrUsername:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current user info
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user info
 */

/**
 * @swagger
 * /users/search:
 *   get:
 *     summary: Search users by username or email
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query (username or email)
 *     responses:
 *       200:
 *         description: List of users
 */

/**
 * @swagger
 * /users/remove:
 *   delete:
 *     summary: Remove current user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User removed
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset link sent (simulated)
 *       404:
 *         description: Email not found
 */

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid token
 */

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, avatar } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(409).json({ error: 'User exists' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hash, avatar });

    const token = signToken(user);
    res.json({ token, user: { id: user._id, username, email, avatar } });
  } catch (e) {
    res.status(500).json({ error: 'Register failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
    });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar } });
  } catch {
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', auth, async (req, res) => {
  const me = await User.findById(req.user.id).select('-password');
  res.json(me);
});

router.get('/search', auth, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  const users = await User.find({
    $or: [
      { username: new RegExp(q, 'i') },
      { email: new RegExp(q, 'i') }
    ]
  }).select('_id username email avatar');
  res.json(users);
});

// Remove current user
router.delete('/remove', auth, async (req, res) => {
  const user = await User.findByIdAndDelete(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ ok: true });
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'Email not found' });

  const token = crypto.randomBytes(32).toString('hex');
  resetTokens[token] = { userId: user._id, expires: Date.now() + 15 * 60 * 1000 }; // 15 min

  // Simulate sending email by returning token in response (replace with email in production)
  res.json({ message: 'Reset link sent', resetToken: token });
});

// Reset password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  const entry = resetTokens[token];
  if (!entry || entry.expires < Date.now()) return res.status(400).json({ error: 'Invalid or expired token' });

  const hash = await bcrypt.hash(password, 10);
  await User.findByIdAndUpdate(entry.userId, { password: hash });
  delete resetTokens[token];

  res.json({ ok: true });
});

module.exports = router;
