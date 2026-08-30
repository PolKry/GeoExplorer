// services/territoryMappingsService.js
const fs = require('fs');
const path = require('path');

const territoryMappings = {};

/*
    Normalizes ISO codes by remapping territories to their parent countries
    Called after server starts
*/
async function loadTerritoryMappings() {
    const filePath = path.join(__dirname, '..', 'data', 'mappings', 'TerritoryMappings.json');
    try {
        const json = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(json);
        Object.assign(territoryMappings, parsed); // cache in memory
        console.log(`Loaded ${Object.keys(territoryMappings).length} territory mappings`);
    } catch (err) {
        console.error('Failed to load territory mappings:', err);
    }
}

// Checks if a guess ISO is mapped to correct ISO
function isCorrect(guess, correct) {
    return normalizeCountry(guess) === normalizeCountry(correct);
}

function normalizeCountry(country) {
    if (territoryMappings[country]) {
        return territoryMappings[country][1];
    }
    return country;
}

// Gets all maps
function getMappings() {
    return territoryMappings;
}

module.exports = {
    loadTerritoryMappings,
    isCorrect,
    normalizeCountry,
    getMappings
};