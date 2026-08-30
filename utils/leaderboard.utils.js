const UserStatsModel = require('../models/user-stats.model');

// Returns the top scores for a given map
async function getTopScores(mapCode, limit = 15, period = null) {
    limit = Math.min(limit, 15);

    const sortField = mapCode === "global"
        ? (period === "daily" ? "dailyScore"
            : period === "monthly" ? "monthlyScore"
                : "totalScore")
        : `countryStats.${mapCode}.highestScore`;

    // Build query: only include users who have stats for this map (if not global)
    const query = mapCode === "global" ? {} : { [`countryStats.${mapCode}`]: { $exists: true } };

    const topUsers = await UserStatsModel.find(query)
        .sort({ [sortField]: -1 })
        .limit(limit)
        .populate("userId", "username") // fetch username from User
        .lean();

    // Use userId directly (you can query usernames separately if needed)
    return topUsers
        .filter(u => u.userId) // remove users that no longer exist
        .map(u => {
            if (mapCode === "global") {
                return {
                    userId: u.userId._id,
                    username: u.userId.username,
                    score: period === "daily" ? u.dailyScore
                        : period === "monthly" ? u.monthlyScore
                            : u.totalScore
                };
            } else {
                const stats = u.countryStats?.[mapCode] ?? {};
                return {
                    userId: u.userId._id,
                    username: u.userId.username,
                    score: stats.highestScore ?? 0,
                    bestTime: stats.bestTime ?? null
                };
            }
        });
}

module.exports = { getTopScores };