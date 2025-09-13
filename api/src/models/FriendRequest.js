const { Schema, model } = require('mongoose');

const frSchema = new Schema({
  from:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  to:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending','accepted','rejected','canceled'], default: 'pending' }
}, { timestamps: true });

frSchema.index({ from: 1, to: 1 }, { unique: true });

module.exports = model('FriendRequest', frSchema);
