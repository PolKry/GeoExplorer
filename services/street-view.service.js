const streetViewUtils = require('../utils/street-view.utils');

async function getRandomLocation(iso) {
  const location = await streetViewUtils.getRandomSVLocation(iso.toUpperCase());
  if (!location) {
    const error = new Error('No Street View found');
    error.status = 404;
    throw error;
  }
  return location;
}

module.exports = {
  getRandomLocation
};
