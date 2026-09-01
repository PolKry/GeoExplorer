const streetViewUtils = require('../utils/street-view.utils');
const { NotFoundError } = require('../utils/app-error.utils');

async function getRandomLocation(iso) {
  const location = await streetViewUtils.getRandomSVLocation(iso.toUpperCase());
  if (!location) {
    throw new NotFoundError('No Street View found');
  }
  return location;
}

module.exports = {
  getRandomLocation
};
