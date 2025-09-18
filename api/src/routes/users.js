const router = require('express').Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');

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

const mapUser = (u) => {
  if (!u) return null;
  return {
    id: String(u._id || u.id),
    username: u.username || '',
    email: u.email || '',
    avatar: u.avatar ? String(u.avatar) : null
  };
};

router.get('/me', auth, async (req, res) => {
  const u = await User.findById(req.user.id).lean();
  if (!u) return res.status(404).json({ error: 'User not found' });
  res.json(mapUser(u));
});

router.get('/search', auth, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  const users = await User.find({
    $or: [
      { username: new RegExp(q, 'i') },
      { email: new RegExp(q, 'i') }
    ]
  }).select('_id username email avatar').lean();
  res.json(users.map(mapUser));
});

module.exports = router;
