const userStatsRepository = require("../repositories/user-stats.repository");
const gameResultRepository = require("../repositories/game-result.repository");
const { ValidationError } = require("../utils/app-error.utils");

const { getXpForLevel } = require("../utils/user-experience.utils");

async function createGameResult(engine, mapCode) {
    try {
        if (!engine || !engine.players || engine.players.length === 0) {
            throw new ValidationError("Invalid engine or no players");
        }

        // Determine winner (highest score)
        const winnerPlayer = engine.players.reduce((best, p) =>
            p.score > best.score ? p : best
        );

        const gameResult = gameResultRepository.build({
            map: mapCode,
            mode: engine.mode?.name || "unknown",
            players: engine.players.map(p => ({
                id: p.id,
                score: p.score,
                streak: p.streak ?? 0,
                totalTime: p.totalTime ?? 0
            })),
            winner: winnerPlayer.id
        });

        await gameResultRepository.save(gameResult);
    } catch (err) {
        console.error("Failed to create game result:", err);
        throw err;
    }
}

/*
    Calculates and updates the player stats like the xp, per-country avrage and highest score, games played, etc...
    Usually gets called after the game finishes
*/
async function updatePlayerStats(userId, player, mode, mapId, mapCode) {
    try {
        const userStats = await userStatsRepository.findByUserId(userId);
        if (!userStats) return;

        // Update per-country stats
        const current = userStats.countryStats.get(mapCode);
        if (!current) {
            userStats.countryStats.set(mapCode, {
                mapId,
                averageScore: player.score,
                highestScore: player.score,
                bestTime: player.totalTime,
                totalScore: player.score,
                gamesPlayed: 1
            });
        } else {
            const newGamesPlayed = current.gamesPlayed + 1;
            const newTotalScore = current.totalScore + player.score;
            userStats.countryStats.set(mapCode, {
                mapId,
                averageScore: newTotalScore / newGamesPlayed,
                highestScore: Math.max(current.highestScore, player.score),
                bestTime: Math.min(current.bestTime ?? Infinity, player.totalTime),
                totalScore: newTotalScore,
                gamesPlayed: newGamesPlayed
            });
        }

        // Update global stats
        userStats.gamesPlayed += 1;
        userStats.dailyScore += player.score;
        userStats.totalScore += player.score;
        userStats.monthlyScore += player.score;
        userStats.averageScore = Math.round(userStats.totalScore / userStats.gamesPlayed);

        // XP & level logic
        userStats.xp += Math.floor(player.score);
        while (userStats.xp >= getXpForLevel(userStats.level)) {
            userStats.xp -= getXpForLevel(userStats.level);
            userStats.level++;
        }

        userStats.lastUpdated = new Date();
        await userStatsRepository.save(userStats);
    } catch (err) {
        console.error("Failed to update user's stats:", err);
        throw err;
    }
}

module.exports = { updatePlayerStats, createGameResult };
