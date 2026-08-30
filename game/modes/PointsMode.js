const GameMode = require('./GameMode');
const Round = require('../Round');
const { getRandomLocation } = require('../../utils/street-view.utils');
const { getDistance, calculateScore } = require('../../utils/game.utils');

class PointsMode extends GameMode {
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
        if (round.guesses.has(userId)) return;

        const distance = getDistance(guess, round.location);
        const points = calculateScore(distance, this.maxDistance);
        console.log("My location: " + guess, "Actual location: " + round.location, "Distance: " + distance);
        player.score = (player.score ?? 0) + points;

        // Always use Map internally
        round.guesses.set(userId, { guess, distance, points });

        console.log("Round guesses:", round.guesses.size, "of", engine.players.length);
    }

    getFinalResults(engine) {
        const results = engine.players.map(p => ({
            userId: p.id,
            score: p.score,
            maxRounds: engine.rounds.length
        }));

        return results;
    }

    isGameFinished(engine) {
        return engine.roundIndex >= this.maxRounds;
    }

    getTotalScore(engine, userId) {
        return engine.getSinglePlayer()?.score ?? 0
    }

    // Payloads
    getRoundStartPayload(engine, userId, map = null) {
        return {
            gameId: engine.getGameId(),
            roundPanoId: engine.round?.location?.panoId || null,
            roundIndex: engine.roundIndex,
            maxRounds: this.maxRounds,
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
            state: engine.getState()
        };
    }

    getGameEndPayload(engine, userId) {
        return {
            gameId: engine.getGameId(),
            totalPoints: this.getTotalScore(engine, userId),
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
            mode: this.getModeName(),
            gameplayMode: engine.gameplayMode,
            state: engine.getState()
        }
    }

    getGuessEndPayload(engine, userId) {
        return {
            gameId: engine.getGameId(),
            userId: userId,
            location: engine.round.location,
            round: engine.round?.toJSON() ?? null,
            state: engine.getState()
        }
    }

    getStatsPayload(player) {
        return {
            maxScore: player.score
        }
    }

    getModeName() {
        return "points";
    }

    static fromSession(session) {
        return new PointsMode(
            session.settings.maxRounds,
            session.settings.roundTime,
            session.mapCode,
            session.mapId,
            session.maxDistance
        );
    }
}

module.exports = PointsMode;