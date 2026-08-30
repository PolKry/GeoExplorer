const UserStats = require('../models/user-stats.model');

function findByUserId(userId) {
  return UserStats.findOne({ userId });
}

function save(userStats) {
  return userStats.save();
}

function resetDailyScoresBefore(date) {
  return UserStats.updateMany(
    { lastUpdated: { $lt: date } },
    { $set: { dailyScore: 0 } }
  );
}

function resetMonthlyScoresBefore(date) {
  return UserStats.updateMany(
    { lastUpdated: { $lt: date } },
    { $set: { monthlyScore: 0 } }
  );
}

module.exports = {
  findByUserId,
  save,
  resetDailyScoresBefore,
  resetMonthlyScoresBefore
};
