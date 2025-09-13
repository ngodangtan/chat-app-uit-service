const router = require('express').Router();
const { auth } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

// tạo / lấy hội thoại 1-1 (ensure)
router.post('/single', auth, async (req, res) => {
  const { otherUserId } = req.body;
  // tìm nếu đã có
  let conv = await Conversation.findOne({
    type: 'single',
    members: { $all: [req.user.id, otherUserId], $size: 2 }
  });
  if (!conv) {
    conv = await Conversation.create({
      type: 'single',
      members: [req.user.id, otherUserId],
      lastMessageAt: new Date()
    });
  }
  res.json(conv);
});

// tạo group
router.post('/group', auth, async (req, res) => {
  const { name, memberIds } = req.body; // memberIds: không bao gồm mình
  const members = Array.from(new Set([req.user.id, ...(memberIds || [])]));
  if (members.length < 3) return res.status(400).json({ error: 'Group needs >= 3 members' });

  const conv = await Conversation.create({
    type: 'group',
    name,
    members,
    admins: [req.user.id],
    lastMessageAt: new Date()
  });
  res.json(conv);
});

// list hội thoại của mình
router.get('/my', auth, async (req, res) => {
  const list = await Conversation.find({ members: req.user.id })
    .sort({ updatedAt: -1 })
    .lean();
  res.json(list);
});

module.exports = router;
