const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true, unique: true },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  bio: { type: String, default: "No bio yet. Add one to tell others more about yourself!" },
  avatar: { type: String, default: "" },
  country: {
    name: { type: String },
    code: { type: String }
  },
  favoriteMaps: [{ type: String }],
  socialLinks: { type: Map, of: String }, // e.g., { twitter: "link", instagram: "link" }
  partyCode: { type: String, default: null },
  
  // Settings
  settings: {
    mapStyle: { type: String, default: 'default' },
    musicVolume: { type: Number, default: 50 },
    sfxVolume: { type: Number, default: 50 },
    soundEnabled: { type: Boolean, default: true },
    fullscreenEnabled: { type: Boolean, default: false }
  }
});

module.exports = mongoose.model("UserProfile", userProfileSchema);