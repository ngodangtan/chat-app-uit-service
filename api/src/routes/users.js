const router = require('express').Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');

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
