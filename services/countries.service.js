const countryRepository = require('../repositories/country.repository');

let cachedCountries = null;

async function fetchCountries() {
  if (cachedCountries) return cachedCountries; // simple cache

  const data = await countryRepository.fetchCountryList();

  const list = Array.isArray(data) ? data : data.data;

  cachedCountries = list.map(c => ({
    name: c.name?.common || c.name,
    code: c.cca2.toLowerCase()
  }));

  return cachedCountries;
}

function getCountries() {
  if (!cachedCountries) {
    throw new Error('Countries not loaded. Call fetchCountries() first.');
  }
  return cachedCountries;
}

module.exports = {
  fetchCountries,
  getCountries
};