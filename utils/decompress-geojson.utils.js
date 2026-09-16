const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function decompressGeoJson(inputFile, outputFile) {
    return new Promise((resolve, reject) => {
        const input = fs.createReadStream(path.resolve(inputFile));
        const output = fs.createWriteStream(path.resolve(outputFile));

        input.on('error', reject);
        output.on('error', reject);
        output.on('finish', resolve);

        input.pipe(zlib.createGunzip()).pipe(output);
    });
}

if (require.main === module) {
    decompressGeoJson(
        path.resolve(__dirname, '../OSMB-ab6dec437f0eedc3d4cddc50244ed1f7825e8eba.geojson.gz'),
        path.resolve(__dirname, '../data/antarctica.geojson')
    )
        .then(() => console.log('Decompressed GeoJSON ready!'))
        .catch(error => {
            console.error(`Failed to decompress GeoJSON: ${error.message}`);
            process.exitCode = 1;
        });
}

module.exports = { decompressGeoJson };