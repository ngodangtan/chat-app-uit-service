const router = require('express').Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

/**
 * @swagger
 * /friends/request:
 *   post:
 *     summary: Send a friend request (by email)
 *     tags: [Friends]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Friend request sent
 *       400:
 *         description: Invalid target
 *       404:
 *         description: User not found
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
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  // find user by email
  const target = await User.findOne({ email: (email || '').toLowerCase().trim() });
  if (!target) return res.status(404).json({ error: 'User not found' });

  if (String(target._id) === String(req.user.id)) return res.status(400).json({ error: 'Invalid target' });

  try {
    // if already friends
    const me = await User.findById(req.user.id).select('friends');
    if (me && me.friends.map(String).includes(String(target._id))) {
      return res.status(400).json({ error: 'Already friends' });
    }

    const exists = await FriendRequest.findOne({ from: req.user.id, to: target._id });
    if (exists && exists.status === 'pending') return res.status(409).json({ error: 'Already sent' });

    const fr = await FriendRequest.findOneAndUpdate(
      { from: req.user.id, to: target._id },
      { $set: { status: 'pending' } },
      { upsert: true, new: true }
    );
    res.json(fr);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// accept lời mời (người nhận chấp nhận)
router.post('/accept', auth, async (req, res) => {
  const { fromUserId, requestId } = req.body;

  if (!fromUserId && !requestId) {
    return res.status(400).json({ error: 'fromUserId or requestId required' });
  }

  let fr = null;
  if (requestId) {
    fr = await FriendRequest.findById(requestId);
  } else {
    // try treat fromUserId as sender user id
    fr = await FriendRequest.findOne({ from: fromUserId, to: req.user.id });
    if (!fr) {
      // maybe client sent the friend-request record id in fromUserId
      try {
        fr = await FriendRequest.findById(fromUserId);
      } catch (e) {
        fr = null;
      }
    }
  }

  if (!fr || String(fr.to) !== String(req.user.id) || fr.status !== 'pending') {
    return res.status(400).json({ error: 'No request' });
  }

  fr.status = 'accepted';
  await fr.save();

  // add into friends for both users
  await User.findByIdAndUpdate(req.user.id, { $addToSet: { friends: fr.from } });
  await User.findByIdAndUpdate(fr.from,   { $addToSet: { friends: req.user.id } });

  res.json({ ok: true });
});

// list bạn
router.get('/list', auth, async (req, res) => {
  const me = await User.findById(req.user.id).populate('friends', '_id username email avatar');
  res.json(me?.friends || []);
});

// pending requests (mình là người nhận)
router.get('/pending', auth, async (req, res) => {
  // populate both from and to with email/avatar so client can parse
  const items = await FriendRequest.find({ to: req.user.id, status: 'pending' })
    .populate('from', '_id username email avatar')
    .populate('to',   '_id username email avatar')
    .lean();

  const normalized = (items || []).map(it => {
    const mapUser = (u) => {
      if (!u) return null;
      return {
        id: String(u._id || u.id),
        username: u.username || '',
        email: u.email || '',
        avatar: u.avatar || null
      };
    };

    // map backend statuses to client enum (client supports: pending, accepted, rejected)
    let status = it.status;
    if (status === 'canceled') status = 'rejected';

    return {
      id: String(it._id || it.id),
      from: mapUser(it.from),
      to: mapUser(it.to),
      status,
      createdAt: it.createdAt,
      updatedAt: it.updatedAt
    };
  });

  res.json(normalized);
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
