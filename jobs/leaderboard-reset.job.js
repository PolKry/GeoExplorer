const cron = require("node-cron");
const UserStats = require("../models/user-stats.model");

// Runs every day at midnight
cron.schedule("0 0 * * *", async () => {
    try {
        console.log("🔄 Resetting daily scores...");

        await UserStats.updateMany({}, { $set: { dailyScore: 0 } });

        console.log("! Daily scores reset !");
    } catch (err) {
        console.error("❌ Failed to reset daily scores:", err);
    }
});

// Runs on the 1st of every month at midnight
cron.schedule("0 0 1 * *", async () => {
    try {
        console.log("🔄 Resetting monthly scores...");

        await UserStats.updateMany({}, { $set: { monthlyScore: 0 } });

        console.log("! Monthly scores reset !");
    } catch (err) {
        console.error("❌ Failed to reset monthly scores:", err);
    }
});