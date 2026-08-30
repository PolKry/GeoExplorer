const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: {
    type: String,
    required: true,
    select: false,
  },
  profilePic: {
    data: Buffer,      // Binary data
    contentType: String // e.g., 'image/jpeg'
  },
  hasCustomProfilePic: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  role: { type: String, default: 'user' },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  isVerified: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', userSchema);