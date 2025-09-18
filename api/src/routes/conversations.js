const router = require('express').Router();
const { auth } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

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

router.post('/single', auth, async (req, res) => {
  const { otherUserId, userId } = req.body;
  const targetId = otherUserId || userId; // ← chấp nhận cả 2
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
  res.json(conv);
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
  res.json(conv);
});

router.get('/my', auth, async (req, res) => {
  const list = await Conversation.find({ members: req.user.id })
    .sort({ updatedAt: -1 })
    .lean();
  res.json(list);
});

module.exports = router;
