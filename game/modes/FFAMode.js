const GameMode = require('./GameMode');
const Round = require('../Round');
const { getRandomLocation } = require('../../utils/street-view.utils');
const { getDistance, calculateScore } = require('../../utils/game.utils');

class FFAMode extends GameMode {
    constructor(maxRounds = 5, roundTime, mapCode, mapId, maxDistance) {
        super();
        this.maxRounds = maxRounds;
        this.roundTime = roundTime;
        this.mapCode = mapCode;
        this.mapId = mapId;
        this.maxDistance = maxDistance;
    }

    async generateRound() {
        const { location, countryCode } = await getRandomLocation(this.mapId);
        return new Round(location, countryCode);
    }

    onGuess(engine, userId, guess) {
        const round = engine.round;

        const player = engine.players.find(p => String(p.id) === String(userId));
        if (!player) return;

        // Prevent double guess
        if (round.guesses.has(String(userId))) return;

        const distance = getDistance(guess, round.location);
        const points = calculateScore(distance, this.maxDistance);

        player.score = (player.score ?? 0) + points;
        player.totalDistance = player.totalDistance == null
            ? distance
            : player.totalDistance + distance;

        player.lastDistance = distance;
        player.guessedRounds = (player.guessedRounds ?? 0) + 1;

        round.guesses.set(String(userId), { guess, distance, points });

        console.log("Round guesses:", round.guesses.size, "of", engine.players.length);
    }

    getFinalResults(engine) {
        const results = engine.players.map(p => ({
            userId: String(p.id),
            score: p.score,
            maxRounds: engine.rounds.length
        }));

        return results;
    }

    isGameFinished(engine) {
        console.log("Checking if game is finished. Round index:", engine.roundIndex, "Max rounds:", this.maxRounds);
        return engine.roundIndex >= this.maxRounds;
    }

    getTotalScore(engine, userId) {
        return engine.getSinglePlayer()?.score ?? 0
    }

    // Payloads
    getRoundStartPayload(engine, userId, map = null) {
        return {
            gameId: engine.getGameId(),
            userId: String(userId),
            roundPanoId: engine.round?.location?.panoId || null,
            roundIndex: engine.roundIndex,
            maxRounds: this.maxRounds,
            totalPoints: this.getTotalScore(engine, userId),
            players: engine.getConnectedPlayers().map(p => engine.toPublicPlayer(p)), // Dont send player guesses info
            mode: this.getModeName(),
            gameplayMode: engine.gameplayMode,
            map: map,
            state: engine.getState()
        };
    }

    getRoundEndPayload(engine, userId) {
        return {
            gameId: engine.getGameId(),
            roundIndex: engine.roundIndex,
            maxRounds: this.maxRounds,
            roundPanoId: engine.round.location?.panoId ?? null,
            totalPoints: this.getTotalScore(engine, userId),
            players: engine.getPlayersWithGuesses(),
            state: engine.getState()
        };
    }

    getNewRoundPayload(engine, userId) {
        return {
            gameId: engine.getGameId(),
            roundIndex: engine.roundIndex,
            maxRounds: this.maxRounds,
            roundPanoId: engine.round.location?.panoId ?? null,
            totalPoints: this.getTotalScore(engine, userId),
            players: engine.getPlayersWithGuesses(),
            state: engine.getState()
        };
    }

    getGameEndPayload(engine) {
        return {
            gameId: engine.getGameId(),
            players: engine.getPlayersWithGuesses(),
            roundTime: this.roundTime,
            state: engine.getState()
        }
    }

    getGameStatusPayload(engine, userId) {
        return {
            gameId: engine.getGameId(),
            roundPanoId: engine.round?.location?.panoId || null,
            roundIndex: engine.roundIndex,
            maxRounds: this.maxRounds,
            totalPoints: this.getTotalScore(engine, userId),
            players: engine.getConnectedPlayers().map(p => engine.toPublicPlayer(p)), // Dont send player guesses info
            totalGuessed: engine.getGuessedPlayersCount(),
            mode: this.getModeName(),
            gameplayMode: engine.gameplayMode,
            state: engine.getState()
        }
    }

    getOnGuessPayload(engine, userId) {
        return {
            gameId: engine.getGameId(),
            userId: String(userId),
            player: engine.getPlayer(userId),
            totalGuessed: engine.getGuessedPlayersCount(),
            state: engine.getState()
        }
    }

    getGuessEndPayload(engine, userId) {
        return {
            gameId: engine.getGameId(),
            userId: String(userId),
            location: engine.round.location,
            round: engine.round?.toJSON() ?? null,
            players: engine.getPlayersWithGuesses(),
            hostId: engine.getHostId(),
            state: engine.getState()
        }
    }

    getStatsPayload(player) {
        return {
            maxScore: player.score
        }
    }

    getModeName() {
        return "ffa";
    }

    static fromSession(session) {
        return new FFAMode(
            session.settings.maxRounds,
            session.settings.roundTime,
            session.mapCode,
            session.mapId,
            session.maxDistance
        );
    }
}

module.exports = FFAMode;