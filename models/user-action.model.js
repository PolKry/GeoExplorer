const mongoose = require('mongoose');

const userActionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true, unique: true },

  currentSingleplayerGameId: { type: String, required: false }
});

module.exports = mongoose.model('UserAction', userActionSchema);