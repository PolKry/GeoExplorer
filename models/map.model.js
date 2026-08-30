const mongoose = require('mongoose');

const mapSchema = new mongoose.Schema({
  name: String,
  image: String,
  author: String,
  date: String,
  difficulty: String,
  type: String,
  category: String,
  description: String,
  tags: [String],
  srcName: String,
  maxDistance: Number,
  fallbackFile: String,
  skipAutoGen: { type: Boolean, default: false, require: true },

  likes: { type: Number, default: 0 }
});

module.exports = mongoose.model('Map', mapSchema);