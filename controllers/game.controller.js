const { sendError } = require('./response.controller');
const gameService = require('../services/game.service');
const mapRepository = require('../repositories/map.repository');

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
        sendError(res, err, 'Failed to start points game');
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
        sendError(res, err, 'Failed to start country game');
    }
};

exports.startGameForParty = async (party) => {
    try {
        const playerIds = party.players.map(p => String(p.user));
        const map = await mapRepository.findById(party.settings.map);

        if (!map) {
            throw new Error("The party's selected map no longer exists");
        }

        const gameData = await gameService.startGame({
            mode: "ffa",
            settings: {
                gameplayMode: "moving",
                // Party settings store a Map ObjectId; games use the map's
                // stable srcName when they resolve the selected map.
                mapCode: map.srcName,
                maxRounds: party.settings.rounds,
                roundTime: party.settings.unlimitedTime ? 5 : party.settings.time
            },
            hostUserId: String(party.host),
            playerIds,
            partyId: party.id
        });

        return gameData;
    } catch (err) {
        console.error(err);
        throw err;
    }
};
