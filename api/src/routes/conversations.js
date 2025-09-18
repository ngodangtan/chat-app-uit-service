const router = require('express').Router();
const { auth } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Message = require('../models/Message');

/**
 * @swagger
 * /conversations/single:
 *   post:
 *     summary: Create or get a single (1-1) conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otherUserId]
 *             properties:
 *               otherUserId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Conversation object
 *       400:
 *         description: Bad request
 */

/**
 * @swagger
 * /conversations/group:
 *   post:
 *     summary: Create a group conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, memberIds]
 *             properties:
 *               name:
 *                 type: string
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Group conversation created
 *       400:
 *         description: Group needs >= 3 members
 */

/**
 * @swagger
 * /conversations/my:
 *   get:
 *     summary: List my conversations
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations
 */

/**
 * @swagger
 * /conversations/{conversationId}:
 *   delete:
 *     summary: Leave or delete a conversation
 *     tags: [Conversations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the conversation to leave or delete
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *       400:
 *         description: Bad request (missing conversationId)
 *       403:
 *         description: No access (not a member)
 *       404:
 *         description: Conversation not found
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

const normalizeConversation = (conv) => {
  return {
    id: String(conv._id || conv.id),
    type: conv.type,
    name: conv.name || null,
    members: (conv.members || []).map(mapUser),
    admins: (conv.admins || []).map(mapUser),
    lastMessageAt: conv.lastMessageAt || null,
    createdAt: conv.createdAt,
    updatedAt: conv.updatedAt
  };
};

router.post('/single', auth, async (req, res) => {
  const { otherUserId, userId } = req.body;
  const targetId = otherUserId || userId; // ← chấp nhận cả 2
  if (!targetId) return res.status(400).json({ error: 'target required' });

  // tìm nếu đã có
  let conv = await Conversation.findOne({
    type: 'single',
    members: { $all: [req.user.id, targetId], $size: 2 }
  });

  if (!conv) {
    conv = await Conversation.create({
      type: 'single',
      members: [req.user.id, targetId],
      lastMessageAt: new Date()
    });
  }

  // populate members/admins to match mobile User model
  const populated = await Conversation.findById(conv._id)
    .populate('members', '_id username email avatar')
    .populate('admins', '_id username email avatar')
    .lean();

  res.json(normalizeConversation(populated));
});

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

  const populated = await Conversation.findById(conv._id)
    .populate('members', '_id username email avatar')
    .populate('admins', '_id username email avatar')
    .lean();

  res.json(normalizeConversation(populated));
});

router.get('/my', auth, async (req, res) => {
  const list = await Conversation.find({ members: req.user.id })
    .sort({ updatedAt: -1 })
    .populate('members', '_id username email avatar')
    .populate('admins', '_id username email avatar')
    .lean();

  res.json((list || []).map(normalizeConversation));
});

// DELETE /conversations/:conversationId — leave or delete conversation
router.delete('/:conversationId', auth, async (req, res) => {
  const { conversationId } = req.params;
  if (!conversationId) return res.status(400).json({ error: 'conversationId required' });

  const conv = await Conversation.findById(conversationId);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  if (!conv.members.map(String).includes(req.user.id)) {
    return res.status(403).json({ error: 'No access' });
  }

  // single: remove conversation and its messages
  if (conv.type === 'single') {
    await Message.deleteMany({ conversationId });
    await Conversation.findByIdAndDelete(conversationId);
    return res.json({ ok: true });
  }

  // group: remove user from members/admins
  await Conversation.findByIdAndUpdate(conversationId, {
    $pull: { members: req.user.id, admins: req.user.id }
  });

  // reload to decide if need to delete entirely
  const updated = await Conversation.findById(conversationId).lean();
  if (!updated) {
    await Message.deleteMany({ conversationId });
    return res.json({ ok: true });
  }

  if ((updated.members || []).length < 2) {
    await Message.deleteMany({ conversationId });
    await Conversation.findByIdAndDelete(conversationId);
  }

  res.json({ ok: true });
});

module.exports = router;
