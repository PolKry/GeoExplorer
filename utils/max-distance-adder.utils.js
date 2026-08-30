// importMaps.js
const fs = require('fs');
const mongoose = require('mongoose');
const Map = require('../models/map.model');
const path = require("path");

require('dotenv').config({ path: './api.env' });

async function addDistanceToDB() {
    try {
        const maps = await Map.find({});

        for (const m of maps) {
            const polyPath = path.resolve(
                __dirname,
                `../data/shapes/${m.srcName}.geojson`
            );

            if (!fs.existsSync(polyPath)) {
                console.error(`❌ Polygon not found: ${polyPath}`);
                continue;
            }

            const rawContent = fs.readFileSync(polyPath, "utf8");
            const rawGeo = JSON.parse(rawContent);
            const geoJson = extractGeometry(rawGeo);

            console.log(`⏳ Computing distance for ${m.srcName}...`);

            console.time('US maxDistance');
            const maxDistance = computeMaxDistanceFast(geoJson);
            console.timeEnd('US maxDistance');

            m.maxDistance = maxDistance;
            await m.save();

            console.log(
                `✅ ${m.srcName} → ${Math.round(maxDistance / 1000)} km`
            );
        }

        console.log('✅ All maps updated successfully.');
    } catch (error) {
        console.error('❌ Error adding distances:', error);
    } finally {
        await mongoose.disconnect();
    }
}

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ MongoDB connected');
        addDistanceToDB();
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
    });

/* ============================= */
/* ===== Distance Engine ======= */
/* ============================= */

function computeMaxDistanceFast(geoJson, sampleCount = 300) {
    const bbox = getBoundingBox(geoJson);

    // Step 1: pre-generate all random points
    const points = [];
    while (points.length < sampleCount) {
        const lat = Math.random() * (bbox.maxLat - bbox.minLat) + bbox.minLat;
        const lng = Math.random() * (bbox.maxLng - bbox.minLng) + bbox.minLng;
        const point = { lat, lng };

        // Check if point is inside any polygon in MultiPolygon
        const polygons =
            geoJson.type === "Polygon" ? [geoJson.coordinates] : geoJson.coordinates;
        let inside = false;
        for (const poly of polygons) {
            if (pointInPolygon(point, poly[0])) {
                inside = true;
                break;
            }
        }
        if (inside) points.push(point);
    }

    // Step 2: pick random pairs to estimate max distance
    let maxDistance = 0;
    for (let i = 0; i < sampleCount; i++) {
        const j = Math.floor(Math.random() * sampleCount);
        const d = getDistance(points[i], points[j]);
        if (d > maxDistance) maxDistance = d;
    }

    return Math.round(maxDistance); // store as integer meters
}

function extractGeometry(geo) {
    if (geo.type === "FeatureCollection") {
        const allPolygons = [];

        for (const feature of geo.features) {
            const geometry = feature.geometry;

            if (!geometry) continue;

            if (geometry.type === "Polygon") {
                allPolygons.push(geometry.coordinates);
            }

            if (geometry.type === "MultiPolygon") {
                for (const poly of geometry.coordinates) {
                    allPolygons.push(poly);
                }
            }
        }

        return {
            type: "MultiPolygon",
            coordinates: allPolygons
        };
    }

    if (geo.type === "Feature") {
        return geo.geometry;
    }

    return geo;
}

function randomPointInPolygon(geoJson, bbox) {
    const polygons =
        geoJson.type === "Polygon"
            ? [geoJson.coordinates]
            : geoJson.coordinates;

    while (true) {
        const lat =
            Math.random() * (bbox.maxLat - bbox.minLat) + bbox.minLat;
        const lng =
            Math.random() * (bbox.maxLng - bbox.minLng) + bbox.minLng;

        const point = { lat, lng };

        for (const polygon of polygons) {
            if (pointInPolygon(point, polygon[0])) {
                return point;
            }
        }
    }
}

function pointInPolygon(point, vs) {
    const x = point.lng;
    const y = point.lat;
    let inside = false;

    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        const xi = vs[i][0],
            yi = vs[i][1];
        const xj = vs[j][0],
            yj = vs[j][1];

        const intersect =
            yi > y !== yj > y &&
            x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

        if (intersect) inside = !inside;
    }

    return inside;
}

function getBoundingBox(geoJson) {
    let minLat = Infinity,
        maxLat = -Infinity;
    let minLng = Infinity,
        maxLng = -Infinity;

    const coords =
        geoJson.type === "Polygon"
            ? [geoJson.coordinates]
            : geoJson.coordinates;

    coords.forEach((polygon) => {
        polygon[0].forEach(([lng, lat]) => {
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
        });
    });

    return { minLat, maxLat, minLng, maxLng };
}

function toRad(deg) {
    return (deg * Math.PI) / 180;
}

function getDistance(p1, p2) {
    const R = 6371000;
    const dLat = toRad(p2.lat - p1.lat);
    const dLng = toRad(p2.lng - p1.lng);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(p1.lat)) *
        Math.cos(toRad(p2.lat)) *
        Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}