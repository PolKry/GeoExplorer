// models/gameResultModel.js
const mongoose = require("mongoose");

const GameResultSchema = new mongoose.Schema({
  map: { type: String, required: true },
  mode: { type: String, required: true },
  players: [{
    id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    score: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    totalTime: { type: Number, default: null, required: true }
  }],
  winner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("GameResult", GameResultSchema);