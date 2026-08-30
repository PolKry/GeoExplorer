const GameResult = require('../models/game-result.model');

function build(doc) {
  return new GameResult(doc);
}

function save(gameResult) {
  return gameResult.save();
}

module.exports = {
  build,
  save
};
