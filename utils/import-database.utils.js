require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const { cleanUnofficialLocations } = require('./clean-unofficial-locations.utils');
const { importMaps } = require('./import-maps.utils');
const { importTags } = require('./import-tags.utils');

async function importDatabase() {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is not configured.');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connection established.');

    try {
        cleanUnofficialLocations();
        await importMaps();
        await importTags();
        console.log('Database import completed successfully.');
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
    }
}

if (require.main === module) {
    importDatabase().catch(error => {
        console.error(`Database import failed: ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = { importDatabase };