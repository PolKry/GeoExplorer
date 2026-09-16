const fs = require('fs');
const path = require('path');

const locationsFolder = path.resolve(__dirname, '../data/locations/countries');

function isPanorama(coord) {
    const panoId = coord.panoId;
    const isUnofficial =
        typeof panoId === 'string' && panoId.startsWith('CAoS');
    const linkCount = coord.links ? coord.links.length : 0;

    return isUnofficial || linkCount <= 2;
}

function cleanUnofficialLocations() {
    if (!fs.existsSync(locationsFolder)) {
        throw new Error(`Locations folder not found at ${locationsFolder}`);
    }

    let cleanedFiles = 0;

    for (const file of fs.readdirSync(locationsFolder)) {
        if (path.extname(file) !== '.json') {
            continue;
        }

        const filePath = path.join(locationsFolder, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        if (!Array.isArray(data.customCoordinates)) {
            continue;
        }

        for (const coord of data.customCoordinates) {
            coord.isPanorama = isPanorama(coord);
            delete coord.zoom;
            delete coord.links;
            delete coord.imageDate;
        }

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        cleanedFiles += 1;
        console.log(`Cleaned: ${file}`);
    }

    console.log(`Cleaned ${cleanedFiles} location file(s).`);
    return cleanedFiles;
}

if (require.main === module) {
    try {
        cleanUnofficialLocations();
    } catch (error) {
        console.error(`Failed to clean locations: ${error.message}`);
        process.exitCode = 1;
    }
}

module.exports = { cleanUnofficialLocations };