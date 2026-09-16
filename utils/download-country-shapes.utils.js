const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

const outputFile = path.resolve(__dirname, '../data/countries.geojson');
const bufferKilometers = -0.2;
const url = 'https://osm-boundaries.com/api/v1/download?db=osm20251103&osmIds=-51684&minAdminLevel=2&maxAdminLevel=2&boundary=administrative&format=GeoJSON&srid=4326&landOnly=true';

async function downloadCountryShapes() {
    const apiKey = process.env.OSM_BOUNDARIES_API_KEY;
    if (!apiKey) {
        throw new Error('OSM_BOUNDARIES_API_KEY is not configured.');
    }

    console.log('Downloading country boundaries...');
    const response = await fetch(url, {
        headers: { 'X-OSMB-Api-Key': apiKey }
    });

    if (!response.ok) {
        throw new Error(`OSM API error: status ${response.status}`);
    }

    const geojson = await response.json();
    console.log(`Downloaded ${geojson.features.length} countries.`);
    console.log(`Applying ${Math.abs(bufferKilometers * 1000)} m inward buffer...`);

    const bufferedFeatures = geojson.features.map(feature => {
        try {
            const buffered = turf.buffer(feature, bufferKilometers, { units: 'kilometers' });
            return {
                type: 'Feature',
                properties: feature.properties,
                geometry: buffered.geometry
            };
        } catch (error) {
            console.warn(`Failed to buffer ${feature.properties.name}: ${error.message}`);
            return feature;
        }
    });

    fs.writeFileSync(outputFile, JSON.stringify({
        type: 'FeatureCollection',
        features: bufferedFeatures
    }));
    console.log(`Saved processed GeoJSON to ${outputFile}`);
}

if (require.main === module) {
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
    downloadCountryShapes().catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    });
}

module.exports = { downloadCountryShapes };