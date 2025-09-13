const { Schema, model } = require('mongoose');

const convSchema = new Schema({
  type: { type: String, enum: ['single','group'], required: true },
  name: { type: String },                 // group name
  members: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
  admins:  [{ type: Schema.Types.ObjectId, ref: 'User' }], // group admins
  lastMessageAt: { type: Date }
}, { timestamps: true });

convSchema.index({ type: 1, members: 1 });

module.exports = model('Conversation', convSchema);
