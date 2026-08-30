class GameMode {
    onGameStart(engine) { }
    getState() { };
    async generateRound() { }
    onRoundStart(engine, round) { }
    onTimerEnd(engine) { }
    onTimerStop(engine) { }
    onTimerStart(engine) { }
    onGuess(engine, playerId, guess) { }
    onGuessingOver(engine) { }
    onRoundEnd(engine) { }
    onGameFinish(engine) { }
    isGameFinished(engine) { return false; }
    getFinalResults(engine) { }
    onGameEnd(engine) { }
    getTotalScore(engine, userId) { return 0 }
    getModeName() { return "undeffined" }
    // By default, returns a player on index 0 (so does not have to be changed for singleplayer, since there is only one player)
    getWinner(engine) { return engine.getSinglePlayer(); }

    // Payloads
    getGameStatusPayload(engine, userId) { return {}; }
    getGameEndPayload(engine) { return {}; }
    getRoundEndPayload(engine) { return {}; }
    getRoundStartPayload(engine, userId, map = null) { return {}; }
    getNewRoundPayload(engine, userId) { return {}; }
    getGuessEndPayload(engine, userId) { return {}; }
    getStatsPayload(player) { return {} }
}

module.exports = GameMode;