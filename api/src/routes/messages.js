const router = require('express').Router();
const { auth } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

/**
 * @swagger
 * /messages/send:
 *   post:
 *     summary: Send a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [conversationId, content]
 *             properties:
 *               conversationId:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message sent
 *       403:
 *         description: No access
 */

/**
 * @swagger
 * /messages/{conversationId}:
 *   get:
 *     summary: Get message history for a conversation
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default 1)
 *     responses:
 *       200:
 *         description: List of messages
 *       403:
 *         description: No access
 */

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
  const limit = parseInt(req.query.limit || '30', 10);
  const msgs = await Message.find({ conversationId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.json(msgs.reverse());
});

module.exports = router;
