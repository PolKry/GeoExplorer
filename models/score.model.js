// models/scoreModel.js
const mongoose = require("mongoose");

const scoreSchema = new mongoose.Schema({
  username: { type: String, required: true },
  score: { type: Number, required: true },
  map: { type: String, required: true }, // e.g. "world", "usa"
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("score", scoreSchema);