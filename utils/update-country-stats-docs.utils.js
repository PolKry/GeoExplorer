const mongoose = require('mongoose');
const UserStatsModel = require("../models/user-stats.model");
require('dotenv').config({ path: './api.env' });

async function migrateAllUsers() {
    const users = await UserStatsModel.find();

    for (const user of users) {
        if (!user.countryStats) continue;

        let updated = false;

        for (const [key, stat] of user.countryStats) {
            if (!stat) continue;

            // Ensure all required fields exist
            stat.averageScore = stat.averageScore ?? 0;
            stat.highestScore = stat.highestScore ?? stat.averageScore;
            stat.bestTime = stat.bestTime ?? Infinity;    // or some high number
            stat.totalScore = stat.totalScore ?? stat.averageScore;
            stat.gamesPlayed = stat.gamesPlayed ?? 0;

            // Update Map to mark changes
            user.countryStats.set(key, stat);
            updated = true;
        }

        if (updated) {
            user.markModified('countryStats'); // critical for Maps
            await user.save();
            console.log(`Updated user ${user._id}`);
        }
    }

    console.log(`✅ All country stats docs of every player have been migrated`);
}

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('✅ MongoDB connected');
        await migrateAllUsers();
        await mongoose.disconnect();
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
    });