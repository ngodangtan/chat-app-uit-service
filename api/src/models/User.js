const { Schema, model } = require('mongoose');

const userSchema = new Schema({
  username: { type: String, required: true, unique: true, index: true },
  email:    { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true }, // bcrypt hash
  avatar:   { type: String },
  friends:  [{ type: Schema.Types.ObjectId, ref: 'User' }], // accepted friends
}, { timestamps: true });

module.exports = model('User', userSchema);
