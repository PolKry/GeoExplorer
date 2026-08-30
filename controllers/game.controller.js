const { getGameClass } = require("../game/getGameClass");
const gameService = require('../services/game.service');

exports.startPointsMode = async (req, res) => {
    try {
        const userId = req.user.userId;

        const gameData = await gameService.startGame({
            mode: "points",
            settings: req.body,
            hostUserId: userId,
            playerIds: [userId]
        });

        const { session, map } = gameData;

        res.json({
            status: gameData.session.state,
            gameId: gameData.gameId,
            mode: session.mode,
            round: session.round,
            roundIndex: session.roundIndex + 1,
            mapId: session.mapCode,
            mapName: map.name,
            roundTime: session.settings.roundTime
        });
    } catch (err) {
        console.error("Failed to start points game:", err);

        res.status(400).json({
            error: err.message
        });
    }
};

exports.startCountryMode = async (req, res) => {
    try {
        const userId = req.user.userId;

        const gameData = await gameService.startGame({
            mode: "country",
            settings: req.body,
            hostUserId: userId,
            playerIds: [userId]
        });

        const { session, map } = gameData;

        res.json({
            status: session.state,
            gameId: gameData.gameId,
            mode: session.mode,
            round: session.round,
            roundIndex: session.roundIndex + 1,
            mapId: session.mapCode,
            mapName: map.name,
            roundTime: session.settings.roundTime
        });
    } catch (err) {
        console.error("Failed to start country game:", err);

        res.status(400).json({
            error: err.message
        });
    }
};

exports.startGameForParty = async (party) => {
    try {
        const playerIds = party.players.map(p => String(p.user));

        const gameData = await gameService.startGame({
            mode: "ffa",
            settings: {
                gameplayMode: "moving",
                mapCode: party.settings.map,
                maxRounds: party.settings.rounds,
                roundTime: party.settings.time
            },
            hostUserId: String(party.host),
            playerIds,
            partyId: party.id
        });

        const session = gameData.session;
        const GameModeClass = getGameClass("ffa");

        const gameInstance = new GameModeClass(
            session.settings.maxRounds,
            session.settings.roundTime,
            session.mapCode,
            session.mapId,
            gameData.map.maxDistance
        );

        gameService.generateThisAndNextRound(gameData, gameInstance);

        return gameData;
    } catch (err) {
        console.error(err);
        throw err;
    }
};