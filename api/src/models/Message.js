const { Schema, model } = require('mongoose');

const msgSchema = new Schema({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', index: true, required: true },
  senderId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content:        { type: String, default: '' },
  attachments:    [{ url: String, type: String }], // optional
  seenBy:         [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

msgSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = model('Message', msgSchema);
