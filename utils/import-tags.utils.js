const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Tag = require('../models/tag.model');

require('dotenv').config({ path: './.env' });

async function importTags() {
    try {
        const tagsPath = path.resolve(__dirname, '../data/mapTags.json');
        if (!fs.existsSync(tagsPath)) {
            console.error(`❌ Tags file not found at ${tagsPath}`);
            process.exit(1);
        }

        const rawContent = fs.readFileSync(tagsPath, 'utf8');
        const tags = JSON.parse(rawContent);

        for (const tag of tags) {
            // Upsert to avoid duplicates by name
            await Tag.findOneAndUpdate(
                { name: tag.name },
                { $set: { description: tag.description || '' } },
                { upsert: true, new: true }
            );
            console.log(`Imported/Updated tag: ${tag.name}`);
        }

        console.log('✅ All tags imported successfully.');
    } catch (error) {
        console.error('❌ Error importing tags:', error);
    } finally {
        await mongoose.disconnect();
    }
}

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB connected');
        return importTags();
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
    });