const fs = require('fs');
const zlib = require('zlib');

const gzFile = './OSMB-ab6dec437f0eedc3d4cddc50244ed1f7825e8eba.geojson.gz';
const outFile = './antarctica.geojson';

const gunzip = zlib.createGunzip();
const input = fs.createReadStream(gzFile);
const output = fs.createWriteStream(outFile);

input.pipe(gunzip).pipe(output);

output.on('finish', () => console.log('Decompressed GeoJSON ready!'));