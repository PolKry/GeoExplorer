const fs = require('fs');
const path = require('path');
const { BadGatewayError, UnprocessableError } = require('../utils/app-error.utils');

const geojsonPath = path.join(__dirname, '..', 'data', 'preview', 'world.geojson');

function getPreviewCountries() {
  return JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
}

async function fetchCountryList() {
  let all = [];
  let offset = 0;
  const limit = 50; // you can increase (try 100)

  while (true) {
    const response = await fetch(
      `https://api.restcountries.com/countries/v5?fields=name,cca2&limit=${limit}&offset=${offset}`,
      {
        headers: {
          Authorization: process.env.REST_COUNTRIES_API_KEY,
        }
      }
    );

    if (!response.ok) {
      throw new BadGatewayError(`Country API error: ${response.status}`);
    }

    const json = await response.json();

    const objects = json.data?.objects;

    if (!Array.isArray(objects)) {
      throw new UnprocessableError('Invalid country API format');
    }

    all.push(...objects);

    // stop when no more pages
    if (!json.data.meta?.more) break;

    offset += limit;
  }

  return all
    .map(c => ({
      name: c.names?.common || c.names?.official,
      cca2: c.codes?.alpha_2
    }))
    .filter(c => c.name && c.cca2)
    .sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = {
  getPreviewCountries,
  fetchCountryList
};