const GameMode = require('./GameMode');
const Round = require('../Round');
const { getRandomLocation } = require('../../utils/street-view.utils');
const { getCountryNameByIso } = require('../../services/country.service');
const { isCorrect, normalizeCountry } = require('../../services/territory-mappings.service');
const GameState = require('../GameState');

class CountryStreakMode extends GameMode {
    constructor(maxRounds = 5, roundTime, mapCode, mapId) {
        super();
        this.maxRounds = maxRounds;
        this.roundTime = roundTime;
        this.mapCode = mapCode;
        this.mapId = mapId;
    }

    async generateRound() {
        let { location, countryCode } = await getRandomLocation(this.mapId);

        // Normalize the code accoarding to the territory mappings
        countryCode = normalizeCountry(countryCode);
        const countryName = await getCountryNameByIso(countryCode);

        return new Round(location, countryCode, countryName);
    }

    onGuess(engine, userId, guess) {
        const round = engine.round;

        const player = engine.getPlayer(userId);
        if (!player) return;

        // Prevent double guess
        if (round.guesses.has(userId)) return;

        const correctCountry = engine.round.countryCode;
        const guessedCountry = normalizeCountry(guess.countryCode);
        console.log(correctCountry + " / " + guessedCountry);

        const correct = isCorrect(guessedCountry, correctCountry);

        if (correct) {
            player.streak++;
        }

        round.guesses.set(userId, { guessedCountry, isCorrect: correct });
    }

    isGameFinished(engine) {
        const guessData = engine.rounds[engine.roundIndex - 1]
            .guesses.get(engine.getSinglePlayer().id.toString());

        // A timed-out round has no guess entry. Treat it as an incorrect
        // answer instead of dereferencing an absent result.
        return engine.roundIndex >= this.maxRounds || !guessData?.isCorrect;
    }

    getStreak(engine) {
        return engine.getSinglePlayer()?.streak ?? 0
    }

    // Payloads
    getRoundStartPayload(engine, userId, map = null) {
        return {
            gameId: engine.getGameId(),
            roundPanoId: engine.round?.location?.panoId || null,
            streak: this.getStreak(engine, userId),
            mode: this.getModeName(),
            map: map,
            state: engine.getState()
        };
    }

    getRoundEndPayload(engine, userId) {
        return {
            gameId: engine.getGameId(),
            maxRounds: this.maxRounds,
            roundPanoId: engine.round.location?.panoId ?? null,
            streak: this.getStreak(engine, userId),
            state: engine.getState()
        };
    }

    getGameEndPayload(engine, userId) {
        return {
            gameId: engine.getGameId(),
            streak: this.getStreak(engine, userId),
            roundTime: this.roundTime,
            state: engine.getState()
        }
    }

    getGameStatusPayload(engine, userId) {
        return {
            gameId: engine.getGameId(),
            roundPanoId: engine.round?.location?.panoId || null,
            maxRounds: this.maxRounds,
            streak: this.getStreak(engine, userId),
            mode: this.getModeName(),
            gameplayMode: engine.gameplayMode,
            state: engine.getState()
        }
    }

    getGuessEndPayload(engine, userId) {
        const guess = engine.round?.guesses.get(String(userId));

        return {
            gameId: engine.getGameId(),
            userId: userId, // This player is "me"
            correctCountry: engine.round.countryCode,
            correctCountryName: engine.round.countryName,
            guessedCountry: guess?.guessedCountry ?? null,
            isCorrect: guess?.isCorrect ?? false,
            round: engine.round?.toJSON() ?? null,
            streak: this.getStreak(engine, userId),
            state: engine.getState()
        }
    }

    getStatsPayload(player) {
        return {
            longestStreak: player.streak
        }
    }

    getModeName() {
        return "country";
    }

    static fromSession(session) {
        return new CountryStreakMode(
            session.settings.maxRounds,
            session.settings.roundTime,
            session.mapCode,
            session.mapId
        );
    }
}

module.exports = CountryStreakMode;
