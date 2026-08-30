const fs = require("fs");
const path = require("path");

// Path to your main maps file
const mapsPath = path.join("maps.json");

// Load JSON
let maps = JSON.parse(fs.readFileSync(mapsPath, "utf8"));

maps = maps.map(map => {
    if (!map.srcName) {
        console.warn("Map missing srcName, skipping:", map);
        return map;
    }

    // Add field if missing
    map.fallbackFile = `/countries/${map.srcName}.json`;

    return map;
});

// Write back to file (prettified)
fs.writeFileSync(mapsPath, JSON.stringify(maps, null, 2), "utf8");

console.log("Done! Updated maps with fallbackFile.");