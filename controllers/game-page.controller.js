const { getModeFromGameId } = require('../utils/game.utils');
const { sendValidationError } = require('./response.controller');

function play(req, res) {
  const gameId = req.params.gameId;
  const mode = getModeFromGameId(gameId);

  try {
    res.render(`${mode}-mode`, { gameId });
  } catch (error) {
    sendValidationError(res, error, 'Unknown mode: ' + mode);
  }
}

module.exports = {
  play
};
