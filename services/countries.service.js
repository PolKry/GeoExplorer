const fs = require('fs/promises');
const path = require('path');

const COUNTRY_CACHE_PATH = path.join(__dirname, '..', 'data', 'country-list.json');
const LOCAL_WORLD_GEOJSON_PATH = path.join(__dirname, '..', 'public', 'data', 'world.geojson');

let cachedCountries = null;
let loadingCountries = null;

function normalizeCountries(countries) {
  const byCode = new Map();
  for (const country of Array.isArray(countries) ? countries : []) {
    const name = String(country?.name || '').trim();
    const code = String(country?.code || '').trim().toLowerCase();
    if (name && /^[a-z]{2}$/.test(code)) byCode.set(code, { name, code });
  }
  return [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function readDiskCache() {
  try {
    const countries = normalizeCountries(JSON.parse(await fs.readFile(COUNTRY_CACHE_PATH, 'utf8')));
    return countries.length ? countries : null;
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('Country cache could not be read:', error.message);
    return null;
  }
}

// Natural Earth data is bundled with the app, so this works without the
// third-party API and creates a persistent cache on first launch.
async function buildLocalFallback() {
  const raw = await fs.readFile(LOCAL_WORLD_GEOJSON_PATH, 'utf8');
  const geojson = JSON.parse(raw.replace(/^\uFEFF/, ''));
  const countries = normalizeCountries(geojson.features?.map(({ properties = {} }) => ({
    name: properties.NAME_EN || properties.ADMIN || properties.NAME,
    code: properties.ISO_A2_EH || properties.ISO_A2
  })));

  if (!countries.length) throw new Error('Bundled world map contains no country codes');
  await fs.writeFile(COUNTRY_CACHE_PATH, JSON.stringify(countries, null, 2), 'utf8');
  console.log(`Created country cache with ${countries.length} countries from bundled map data.`);
  return countries;
}

async function fetchCountries() {
  if (cachedCountries) return cachedCountries;
  if (loadingCountries) return loadingCountries;

  loadingCountries = (async () => {
    // Startup never waits on, or fails because of, the rate-limited API.
    cachedCountries = await readDiskCache() || await buildLocalFallback();
    console.log(`Loaded ${cachedCountries.length} countries from local cache.`);
    return cachedCountries;
  })();

  try {
    return await loadingCountries;
  } finally {
    loadingCountries = null;
  }
}

function getCountries() {
  if (!cachedCountries) throw new Error('Countries have not been loaded yet.');
  return cachedCountries;
}

async function getPreviewCountries() {
  const raw = await fs.readFile(LOCAL_WORLD_GEOJSON_PATH, 'utf8');
  return JSON.parse(raw.replace(/^\uFEFF/, ''));
}

module.exports = { fetchCountries, getCountries, getPreviewCountries };
