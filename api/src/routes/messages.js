const router = require('express').Router();
const { auth } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// gửi tin nhắn
router.post('/send', auth, async (req, res) => {
  const { conversationId, content } = req.body;
  const conv = await Conversation.findById(conversationId);
  if (!conv || !conv.members.map(String).includes(req.user.id))
    return res.status(403).json({ error: 'No access' });

  const msg = await Message.create({
    conversationId,
    senderId: req.user.id,
    content: content || ''
  });

  conv.lastMessageAt = new Date();
  await conv.save();

  res.json(msg);
});

// lấy lịch sử
router.get('/:conversationId', auth, async (req, res) => {
  const { conversationId } = req.params;
  const conv = await Conversation.findById(conversationId);
  if (!conv || !conv.members.map(String).includes(req.user.id))
    return res.status(403).json({ error: 'No access' });

  const page = parseInt(req.query.page || '1', 10);
  const limit = 30;
  const msgs = await Message.find({ conversationId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.json(msgs.reverse());
});

module.exports = router;
