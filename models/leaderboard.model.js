// models/leaderboardModel.js
const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    score: { type: Number, required: true, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('leaderboardModel', leaderboardSchema);