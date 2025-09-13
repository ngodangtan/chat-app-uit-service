const router = require('express').Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const { signToken } = require('../middleware/auth');

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

module.exports = router;
