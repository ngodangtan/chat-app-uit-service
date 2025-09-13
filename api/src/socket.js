const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

module.exports = function init(server) {
  const io = new Server(server, { cors: { origin: '*' } });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('no token'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.id;
      next();
    } catch {
      next(new Error('invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;

    // join rooms theo conversation mà user là member
    const convIds = (await Conversation.find({ members: userId }).select('_id')).map(c => c._id.toString());
    convIds.forEach(id => socket.join(`conv:${id}`));

    socket.on('chat:send', async ({ conversationId, content }) => {
      // validate quyền
      const conv = await Conversation.findById(conversationId);
      if (!conv || !conv.members.map(String).includes(userId)) return;

      const msg = await Message.create({ conversationId, senderId: userId, content: content || '' });
      await Conversation.findByIdAndUpdate(conversationId, { $set: { lastMessageAt: new Date() } });

      io.to(`conv:${conversationId}`).emit('chat:new', {
        _id: msg._id, conversationId, senderId: userId, content: msg.content, createdAt: msg.createdAt
      });
    });

    socket.on('chat:typing', ({ conversationId, isTyping }) => {
      socket.to(`conv:${conversationId}`).emit('chat:typing', { userId, isTyping });
    });

    socket.on('chat:seen', async ({ conversationId }) => {
      await Message.updateMany(
        { conversationId, senderId: { $ne: userId }, seenBy: { $ne: userId } },
        { $addToSet: { seenBy: userId } }
      );
      socket.to(`conv:${conversationId}`).emit('chat:seen', { userId, conversationId });
    });
  });

  return io;
};
