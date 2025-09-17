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

module.exports = router;
