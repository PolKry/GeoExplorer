const fetch = require('node-fetch');
const fs = require('fs');
const turf = require('@turf/turf');
const { BadGatewayError } = require('./utils/app-error.utils');

// === CONFIG ===
const API_KEY = '2befc2e6f2e7a8f7b3190e4fab247c66'; // <-- replace with your key
const OUTPUT_FILE = './countries.geojson';
const BUFFER_KM = -0.2; // inward buffer (adjust as needed)

// === Step 1: Define OSM-Boundaries API URL for all countries (admin_level=2) ===
const url = 'https://osm-boundaries.com/api/v1/download?db=osm20251103&osmIds=-51684&minAdminLevel=2&maxAdminLevel=2&boundary=administrative&format=GeoJSON&srid=4326&landOnly=true';

// === Step 2: Fetch GeoJSON from OSM-Boundaries ===
async function downloadAndProcess() {
    console.log('Downloading country boundaries...');
    const res = await fetch(url, {
        headers: {
            'X-OSMB-Api-Key': API_KEY
        }
    });

    if (!res.ok) {
        throw new BadGatewayError(`OSM API error! status: ${res.status}`);
    }

    const geojson = await res.json();
    console.log(`Downloaded ${geojson.features.length} countries.`);

    // === Step 3: Apply inward buffer to all polygons ===
    console.log(`Applying ${Math.abs(BUFFER_KM * 1000)} m inward buffer...`);
    const bufferedFeatures = geojson.features.map(f => {
        try {
            const geom = turf.buffer(f, BUFFER_KM, { units: 'kilometers' });
            return {
                type: 'Feature',
                properties: f.properties,
                geometry: geom.geometry
            };
        } catch (e) {
            console.warn(`Failed to buffer ${f.properties.name}:`, e.message);
            return f; // fallback to original geometry
        }
    });

    const outputGeoJSON = {
        type: 'FeatureCollection',
        features: bufferedFeatures
    };

    // === Step 4: Save minified GeoJSON ===
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputGeoJSON));
    console.log(`Saved processed GeoJSON to ${OUTPUT_FILE}`);
}

downloadAndProcess().catch(console.error);
