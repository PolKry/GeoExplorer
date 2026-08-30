const fs = require('fs');

// Load your original maps JSON
const mapsData = JSON.parse(fs.readFileSync('maps.json', 'utf8'));

// Extract all mapCodes
const mapCodes = mapsData
    .map(map => map.srcName)
    .filter(code => typeof code === 'string' && code.length === 2);

// Create the new structure
const output = {
    type: "composite",
    includes: mapCodes
};

// Save it to a new JSON file
fs.writeFileSync('data/locations/composites/World.json', JSON.stringify(output, null, 2), 'utf8');

console.log('World.json created successfully!');