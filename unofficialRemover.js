const fs = require('fs');
const path = require('path');

const folderPath = 'C:\\Users\\Fanda555\\VS\\Geoguessr\\data\\locations\\countries';

function isPanorama(coord) {
    const panoId = coord.panoId;

    const isUnofficial =
        typeof panoId === 'string' && panoId.startsWith('CAoS');

    const linkCount = coord.links ? coord.links.length : 0;

    const isStatic = linkCount === 0;
    const isTrekker = linkCount > 0 && linkCount <= 2;

    return isUnofficial || isStatic || isTrekker;
}

if (Array.isArray(data.customCoordinates)) {
    fs.readdirSync(folderPath).forEach(file => {
        const fullPath = path.join(folderPath, file);

        if (path.extname(file) === '.json') {
            try {
                const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

                data.customCoordinates.forEach(coord => {
                    coord.isPanorama = isPanorama(coord); // detect first

                    delete coord.zoom;
                    delete coord.links;
                    delete coord.imageDate;
                });

                fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
                console.log(`✅ Cleaned: ${file}`);
            } catch (err) {
                console.error(`❌ Failed to handle ${file}:`, err.message);
            }
        }
    });
}