const fs = require("fs");
const path = require("path");

class MapManager {
    constructor() {
        this.officialPath = path.join(__dirname, "official");
        this.communityPath = path.join(__dirname, "community");
        this.maps = new Map();
        this.loadAllMaps();
    }

    loadAllMaps() {
        // Load official maps
        fs.readdirSync(this.officialPath).forEach(file => {
            const data = JSON.parse(fs.readFileSync(path.join(this.officialPath, file)));
            this.maps.set(data.id, data);
        });

        // Load community maps
        fs.readdirSync(this.communityPath).forEach(file => {
            const data = JSON.parse(fs.readFileSync(path.join(this.communityPath, file)));
            this.maps.set(data.id, data);
        });

        console.log(`[MapManager] Loaded ${this.maps.size} maps.`);
    }

    getMap(mapId) {
        return this.maps.get(mapId) || null;
    }
}

module.exports = new MapManager();