const PartyModel = require('../models/party.model');
const GameSession = require('../models/game-session.model');

function deletePartyByCode(code) {
  return PartyModel.deleteOne({ code });
}

function deleteGameSession(gameId) {
  return GameSession.deleteOne({ gameId });
}

function findActiveParties() {
  return PartyModel.find({ status: { $ne: 'finished' } }).lean();
}

module.exports = {
  deletePartyByCode,
  deleteGameSession,
  findActiveParties
};
