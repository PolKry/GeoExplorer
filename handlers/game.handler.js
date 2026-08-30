const Party = require("../models/party.model");
const GameEngine = require("../game/GameEngine");
const getGameClass = require("../game/getGameClass");
const Player = require("../game/Player");

function setupGameEvents(io, activeGames) {
}

// Helpers
function serializeEngine(engine) {
    return {
        state: engine.state,
        gameplayMode: engine.gameplayMode,
        roundIndex: engine.roundIndex,
        maxRounds: engine.mode.maxRounds,
        round: engine.round,
        players: engine.players.map(p => ({
            id: p.id,
            username: p.username,
            score: p.score,
            team: p.team
        }))
    };
}

function serializeRound(engine) {
    return {
        round: engine.round,
        players: engine.players
    };
}

module.exports = setupGameEvents;