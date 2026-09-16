const fs = require('fs');
const path = require('path');
const Tag = require('../models/tag.model');

async function importTags() {
    const tagsPath = path.resolve(__dirname, '../data/mapTags.json');
    if (!fs.existsSync(tagsPath)) {
        throw new Error(`Tags file not found at ${tagsPath}`);
    }

    const tags = JSON.parse(fs.readFileSync(tagsPath, 'utf8'));

    for (const tag of tags) {
        await Tag.findOneAndUpdate(
            { name: tag.name },
            { $set: { description: tag.description || '' } },
            { upsert: true, new: true }
        );
        console.log(`Imported/Updated tag: ${tag.name}`);
    }

    console.log('All tags imported successfully.');
    return tags.length;
}

module.exports = { importTags };