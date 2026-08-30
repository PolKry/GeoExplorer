const { getModeFromGameId } = require('../utils/game.utils');

function play(req, res) {
  const gameId = req.params.gameId;
  const mode = getModeFromGameId(gameId);

  try {
    res.render(`${mode}-mode`, { gameId });
  } catch (error) {
    res.status(400).send('Unknown mode: ', error);
  }
}

module.exports = {
  play
};
