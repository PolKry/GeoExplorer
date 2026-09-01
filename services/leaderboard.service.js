const { getTopScores } = require('../utils/leaderboard.utils');

function getLeaderboard(map, limit, period) {
  return getTopScores(map, parseInt(limit, 10) || 15, period);
}

module.exports = {
  getLeaderboard
};