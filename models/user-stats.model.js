const mongoose = require('mongoose');

const CountryStatsSchema = new mongoose.Schema({
  mapId: { type: mongoose.Schema.Types.ObjectId, ref: 'Map', required: true, index: true, unique: true },
  averageScore: { type: Number, required: true, default: 0 },
  highestScore: { type: Number, required: true, default: 0 },
  bestTime: { type: Number, required: true, default: Infinity },
  totalScore: { type: Number, required: true, default: 0 },
  gamesPlayed: { type: Number, required: true, default: 0 }

}, { _id: false });

const UserStatsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true, unique: true },
  countryStats: {
    type: Map,
    of: CountryStatsSchema,
    default: {}
  },

  // Global stats
  gamesPlayed: { type: Number, required: true, default: 0 },
  averageScore: { type: Number, required: true, default: 0 },
  dailyScore: { type: Number, required: true, default: 0 },
  monthlyScore: { type: Number, required: true, default: 0 },
  totalScore: { type: Number, required: true, default: 0 },
  maxScore: { type: Number, required: true, default: 0 },
  currentStreak: { type: Number, required: true, default: 0 },
  longestStreak: { type: Number, required: true, default: 0 },
  accuracy: { type: Number, required: true, default: 0 },
  level: { type: Number, required: true, default: 1 },
  xp: { type: Number, required: true, default: 0 },

  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserStats', UserStatsSchema);