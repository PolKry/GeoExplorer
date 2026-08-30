const userStatsRepository = require("../repositories/user-stats.repository");

async function checkStatResets() {
    try {
        const now = new Date();

        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        await userStatsRepository.resetDailyScoresBefore(today);

        await userStatsRepository.resetMonthlyScoresBefore(monthStart);

        console.log("Stats reset check done");
    } catch (err) {
        console.error('Failed to reset stats:', err);
    }
}

module.exports = {
    checkStatResets
};
