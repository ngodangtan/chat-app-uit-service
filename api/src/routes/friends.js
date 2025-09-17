const router = require('express').Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

/**
 * @swagger
 * /friends/request:
 *   post:
 *     summary: Send a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [toUserId]
 *             properties:
 *               toUserId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Friend request sent
 *       400:
 *         description: Invalid target
 *       409:
 *         description: Already sent
 */

/**
 * @swagger
 * /friends/accept:
 *   post:
 *     summary: Accept a friend request
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fromUserId]
 *             properties:
 *               fromUserId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Friend request accepted
 *       400:
 *         description: No request
 */

/**
 * @swagger
 * /friends/list:
 *   get:
 *     summary: List my friends
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of friends
 */

/**
 * @swagger
 * /friends/pending:
 *   get:
 *     summary: List pending friend requests
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending requests
 */

/**
 * @swagger
 * /friends/{friendId}:
 *   delete:
 *     summary: Remove a friend (unfriend)
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of friend to remove
 *     responses:
 *       200:
 *         description: Friend removed
 *       400:
 *         description: Bad request
 *       404:
 *         description: Friend not found
 */

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

// Huỷ kết bạn (unfriend)
router.delete('/:friendId', auth, async (req, res) => {
  const { friendId } = req.params;
  if (!friendId) return res.status(400).json({ error: 'friendId required' });

  const me = await User.findById(req.user.id).select('friends');
  if (!me) return res.status(404).json({ error: 'User not found' });

  const isFriend = me.friends.map(String).includes(String(friendId));
  if (!isFriend) return res.status(404).json({ error: 'Friend not found' });

  // remove friend from both users
  await User.findByIdAndUpdate(req.user.id, { $pull: { friends: friendId } });
  await User.findByIdAndUpdate(friendId, { $pull: { friends: req.user.id } });

  // remove any friend requests between them
  await FriendRequest.deleteMany({
    $or: [
      { from: req.user.id, to: friendId },
      { from: friendId, to: req.user.id }
    ]
  });

  res.json({ ok: true });
});

module.exports = router;
