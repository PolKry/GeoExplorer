const GameSession = require('../models/game-session.model');

function create(doc) {
  return GameSession.create(doc);
}

function updateByGameId(gameId, update) {
  return GameSession.updateOne({ gameId }, update);
}

function findActive() {
  return GameSession.find({ state: { $ne: 'finished' } }).lean();
}

module.exports = {
  create,
  updateByGameId,
  findActive
};
