// utils/gameUtils.js

function toRad(deg) {
  return deg * Math.PI / 180;
}

function getDistance(p1, p2) {
  const R = 6371e3; // meters
  const lat1 = toRad(p1.lat), lat2 = toRad(p2.lat);
  const dLat = lat2 - lat1;
  const dLng = toRad(p2.lng - p1.lng);

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function computeDistanceMeters(latlng1, latlng2) {
  const R = 6371000; // Earth radius in meters

  const lat1 = latlng1.lat;
  const lng1 = latlng1.lng;
  const lat2 = latlng2.lat;
  const lng2 = latlng2.lng;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  console.log(R, c, R * c);

  return R * c;
}

// Uses: distance / countryMaxDistance
function calculateScore(distanceMeters, maxDistanceMeters) {
  const WORLD_MAX_DISTANCE = 20000000;
  const effectiveMaxDistance =
    maxDistanceMeters ?? WORLD_MAX_DISTANCE;

  if (distanceMeters <= 200) return 5000;

  const ratio = distanceMeters / effectiveMaxDistance;
  const decay = 15;        // higher decay = harsher
  const curvePower = 1.2;  // closer to linear, harsher on small distances

  const score = 5000 * Math.exp(-decay * Math.pow(ratio, curvePower));

  return Math.round(Math.max(0, Math.min(5000, score)));
}

function isValidRoundTime(seconds) {
  // Must be a number
  if (typeof seconds !== "number") return false;

  // Special case: 5 seconds = infinite
  if (seconds === 5) return true;

  // Min 10s, max 10m (600s)
  if (seconds < 10 || seconds > 600) return false;

  // Must be in steps of 5
  return seconds % 5 === 0;
}

function normalizeRoundTime(seconds) {
  if (!isValidRoundTime(seconds)) {
    throw new Error("Invalid round time");
  }

  // Map 5s = infinite
  return seconds === 5 ? Infinity : seconds;
}

/* function getCountryFromCoords(point) {
  const pt = turf.point([point.lng, point.lat]);

  for (const country of countries.features) {
    if (turf.booleanPointInPolygon(pt, country)) {
      return country.properties.ISO_A2;
    }
  }
} */

function getModeFromGameId(gameId) {
  return gameId.split("-")[0];
}

module.exports = {
  computeDistanceMeters,
  calculateScore,
  getDistance,
  normalizeRoundTime,
  getModeFromGameId
};