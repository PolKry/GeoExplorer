const leaderboardService = require('../services/leaderboard.service');
const { sendError } = require('./response.controller');

async function allTime(req, res) {
  try {
    const topPlayers = await leaderboardService.getLeaderboard(req.params.map, req.query.limit);
    res.json({ topPlayers });
  } catch (error) {
    sendError(res, error);
  }
}

async function period(req, res) {
  try {
    const topPlayers = await leaderboardService.getLeaderboard(req.params.map, req.query.limit, req.params.period);
    res.json({ topPlayers });
  } catch (error) {
    sendError(res, error);
  }
}

module.exports = {
  allTime,
  period
};
