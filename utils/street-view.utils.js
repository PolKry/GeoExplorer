const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const turf = require("@turf/turf");
const fetch = require("node-fetch");

const MapModel = require("../models/map.model");
const LocationData = require("../models/location-data.model");

const countryCache = new Map();
const fallbackCache = new Map();

// Country Polygons
function extractPolygons(geometry) {
    if (!geometry) return [];

    if (geometry.type === "Polygon") return [geometry.coordinates];
    if (geometry.type === "MultiPolygon") return geometry.coordinates;
    if (geometry.type === "GeometryCollection") {
        let coords = [];
        for (const g of geometry.geometries) {
            coords = coords.concat(extractPolygons(g));
        }
        return coords;
    }

    return [];
}

// Takes a long time (for countries like canada, US, etc...), but is almost instant when cached
async function getCountryPolygon(code) {
    code = code.toUpperCase();
    if (countryCache.has(code)) return countryCache.get(code);

    try {
        const geojsonPath = path.join(__dirname, "..", "data", "shapes", `${code}.geojson`);
        const fileData = await fsPromises.readFile(geojsonPath, 'utf8');
        const geojson = JSON.parse(fileData);
        let polygons = [];

        if (geojson.type === "FeatureCollection") {
            for (const feature of geojson.features) {
                polygons = polygons.concat(extractPolygons(feature.geometry));
            }
        } else if (geojson.type === "Feature") {
            polygons = extractPolygons(geojson.geometry);
        } else {
            polygons = extractPolygons(geojson);
        }

        if (!polygons.length) throw new Error("Unknown Geometry Type");

        const poly = { type: "MultiPolygon", coordinates: polygons };

        countryCache.set(code, poly);
        return poly;

    } catch (err) {
        console.error(`Could not load polygon for country code ${code}:`, err.message);
        return null;
    }
}

function getRandomPointsInside(poly, count = 10) {
    let bbox;
    try {
        bbox = turf.bbox(poly);
    } catch (err) {
        console.error("Invalid polygon for Turf bbox:", err.message, poly);
        return [];
    }

    const points = [];

    for (let attempts = 0; points.length < count && attempts < count * 5; attempts++) {
        const pt = turf.randomPoint(1, { bbox }).features[0];
        if (turf.booleanPointInPolygon(pt, poly)) {
            const [lng, lat] = pt.geometry.coordinates;
            points.push({ lat, lng });
        }
    }

    return points;
}


// Google SV
async function checkStreetView(lat, lng, radius = 15000) {
    const url =
        `https://maps.googleapis.com/maps/api/streetview/metadata` +
        `?location=${lat},${lng}&radius=${radius}&key=${process.env.GOOGLE_API_KEY}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (
            data.status === "OK" &&
            data.copyright?.toLowerCase().includes("google") &&
            !data.pano_id.startsWith('CAoS') // Unofficial
        ) {
            return {
                panoId: data.pano_id,
                lat: data.location.lat,
                lng: data.location.lng
            };
        }
    } catch (err) {
        console.error("Street View error:", err);
    }

    return null;
}

async function checkStreetViewInsideCountry(poly, lat, lng) {
    const sv = await checkStreetView(lat, lng, 50);
    if (!sv) return null;

    const pt = turf.point([sv.lng, sv.lat]);
    return turf.booleanPointInPolygon(pt, poly) ? sv : null;
}

// Fallback Locs
function loadFallbackLocations(map) {
    if (!map?.fallbackFile) return [];
    console.log(map.fallbackFile);
    const filePath = path.join(__dirname, "..", "data", "locations", map.fallbackFile);
    if (fallbackCache.has(filePath)) return fallbackCache.get(filePath);

    try {
        if (!fs.existsSync(filePath)) return [];

        const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
        const coords = Array.isArray(json.customCoordinates) ? json.customCoordinates : [];

        fallbackCache.set(filePath, coords);
        return coords;
    } catch (err) {
        console.error("Fallback load failed:", err);
        fallbackCache.set(filePath, []);
        return [];
    }
}

// Composite Countries
async function chooseCountryWeighted(codes) {
    let total = 0;
    const weights = [];

    for (const code of codes) {
        const poly = await getCountryPolygon(code); // await here
        if (!poly) continue;

        const area = turf.area(poly);
        if (area > 0) {
            total += area;
            weights.push({ code, area });
        }
    }

    if (!weights.length) return null;

    let r = Math.random() * total;
    for (const w of weights) {
        if ((r -= w.area) <= 0) return w.code;
    }

    return weights.at(-1).code;
}

async function chooseCountry(codes) {
    if (!codes.length) return null;

    const index = Math.floor(Math.random() * codes.length);
    return codes[index];
}

async function getCompositeCountry(fallbackFile) {
    const filePath = path.join(__dirname, "..", "data", "locations", fallbackFile);
    if (!fs.existsSync(filePath)) return null;

    const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(json.includes)) return null;

    return await chooseCountry(json.includes);
}


// Auto Gen
async function tryAutoGeneration(poly) {
    // Takes a long time
    const points = getRandomPointsInside(poly, 6);

    for (const p of points) {
        const sv = await checkStreetViewInsideCountry(poly, p.lat, p.lng);

        //console.log("Checking point", p)
        if (sv) {
            //console.log("Point:", p, "is in poly", poly);
            return sv;

        }
    }
    return null;
}

// Normalization
function normalizeLocation(loc) {
    console.log('Pano URL:', `https://www.google.com/maps/@?api=1&map_action=pano&pano=${loc.panoId}`);

    return {
        panoId: loc.panoId ?? null,
        lat: loc.lat,
        lng: loc.lng,
        heading: loc.heading ?? 0
    };
}

// Main Entry Point
async function getRandomLocation(mapId) {
    if (!mapId) throw new Error("Map id required");

    let mapData = await MapModel.findById(mapId).lean();
    if (!mapData) throw new Error("Map not found:");

    if (mapData.type === "Official") {
        // Official Maps
        return await getOfficialMap(mapData);
    } else if (mapData.type === "Unofficial") {
        // Community Maps
        return await getUnofficialMap(mapData);
    }

    console.error("Could not find any locations for", mapData.srcName);
    return null;
}

async function getOfficialMap(mapData) {
    if (mapData.type === "Official") {
        let countryCode = mapData.srcName;

        if (mapData.category === "CountryGroup") {
            countryCode = await getCompositeCountry(mapData.fallbackFile);
            if (!countryCode) throw new Error("Composite country not found");

            mapData = await MapModel.findOne({ srcName: countryCode }).lean();
            if (!mapData) throw new Error("Map not found: " + countryCode);
        }

        const poly = await getCountryPolygon(countryCode);
        if (!poly) console.error("Country polygon missing");

        if (!mapData.skipAutoGen) {
            const sv = await tryAutoGeneration(poly);
            if (sv) {
                console.log("Location generated by auto generation");
                return { location: normalizeLocation(sv), countryCode };
            }
        }

        const validFallback = await getValidFallback(mapData, poly);
        if (validFallback) {
            console.log(`Location generated by fallback (skipAutoGen: ${mapData.skipAutoGen})`);

            return { location: normalizeLocation(validFallback), countryCode };
        }

        console.warn("No valid fallback locations left", countryCode);
    }
}

async function getUnofficialMap(mapData) {
    const mapId = mapData._id;

    const count = await LocationData.countDocuments({ mapId });
    if (!count) throw new Error("No locations in community map");

    const random = Math.floor(Math.random() * count);

    const loc = await LocationData
        .findOne({ mapId })
        .skip(random)
        .lean();

    if (!loc) throw new Error("Failed to pick random location");

    return {
        location: normalizeLocation({
            panoId: loc.panoId,
            lat: loc.loc.coordinates[1],
            lng: loc.loc.coordinates[0],
            heading: loc.heading
        })
    }
}

async function getValidFallback(mapData, poly, maxAttempts = 5) {
    const fallback = loadFallbackLocations(mapData);
    if (!fallback.length) return null;

    for (let i = 0; i < maxAttempts && fallback.length; i++) {
        const index = Math.floor(Math.random() * fallback.length);
        const loc = fallback[index];

        const valid = await validateFallbackLocation(loc, poly);

        if (valid) return valid;

        // invalid => remove permanently
        await removeFallbackFromFile(mapData, loc);
        fallback.splice(index, 1);
    }

    return null;
}

async function validateFallbackLocation(loc, poly) {
    if (!loc?.lat || !loc?.lng) return null;

    const sv = await checkStreetView(loc.lat, loc.lng, 50);
    if (!sv) return null;

    if (poly) {
        const pt = turf.point([sv.lng, sv.lat]);
        if (!turf.booleanPointInPolygon(pt, poly)) return null;
    }

    return normalizeLocation({
        panoId: sv.panoId,
        lat: sv.lat,
        lng: sv.lng,
        heading: loc.heading
    });
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function removeFallbackFromFile(mapData, badLoc) {
    if (!mapData?.fallbackFile) return;

    const filePath = path.join(__dirname, "..", "data", "locations", mapData.fallbackFile);

    try {
        if (!fs.existsSync(filePath)) return;

        const json = JSON.parse(await fsPromises.readFile(filePath, "utf8"));
        if (!Array.isArray(json.customCoordinates)) return;

        const before = json.customCoordinates.length;

        json.customCoordinates = json.customCoordinates.filter(
            l => !(l.lat === badLoc.lat && l.lng === badLoc.lng)
        );

        if (json.customCoordinates.length === before) return;

        await fsPromises.writeFile(
            filePath,
            JSON.stringify(json, null, 2),
            "utf8"
        );

        // keep memory cache in sync
        fallbackCache.set(filePath, json.customCoordinates);

        console.warn(
            `Removed invalid fallback ${badLoc.lat},${badLoc.lng} from ${mapData.fallbackFile}`
        );

    } catch (err) {
        console.error("Failed to prune fallback location:", err.message);
    }
}

module.exports = {
    getRandomLocation,
    getCountryPolygon,
    getRandomPointsInside,
    checkStreetView,
    loadFallbackLocations
};
