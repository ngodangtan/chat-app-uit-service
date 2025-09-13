const router = require('express').Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

// gửi lời mời
router.post('/request', auth, async (req, res) => {
  const { toUserId } = req.body;
  if (toUserId === req.user.id) return res.status(400).json({ error: 'Invalid target' });

  try {
    const exists = await FriendRequest.findOne({ from: req.user.id, to: toUserId });
    if (exists && exists.status === 'pending') return res.status(409).json({ error: 'Already sent' });

    const fr = await FriendRequest.findOneAndUpdate(
      { from: req.user.id, to: toUserId },
      { $set: { status: 'pending' } },
      { upsert: true, new: true }
    );
    res.json(fr);
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

// accept lời mời (người nhận chấp nhận)
router.post('/accept', auth, async (req, res) => {
  const { fromUserId } = req.body;
  const fr = await FriendRequest.findOne({ from: fromUserId, to: req.user.id });
  if (!fr || fr.status !== 'pending') return res.status(400).json({ error: 'No request' });

  fr.status = 'accepted';
  await fr.save();

  // add vào friends của cả 2
  await User.findByIdAndUpdate(req.user.id, { $addToSet: { friends: fromUserId } });
  await User.findByIdAndUpdate(fromUserId,   { $addToSet: { friends: req.user.id } });

  res.json({ ok: true });
});

// list bạn
router.get('/list', auth, async (req, res) => {
  const me = await User.findById(req.user.id).populate('friends', '_id username email avatar');
  res.json(me?.friends || []);
});

// pending requests (mình là người nhận)
router.get('/pending', auth, async (req, res) => {
  const items = await FriendRequest.find({ to: req.user.id, status: 'pending' }).populate('from', '_id username avatar');
  res.json(items);
});

module.exports = router;
