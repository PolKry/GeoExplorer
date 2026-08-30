const LocationData = require('../models/location-data.model');

function findByMapId(mapId) {
  return LocationData.find({ mapId }).lean();
}

function insertMany(docs, options = {}) {
  return LocationData.insertMany(docs, options);
}

module.exports = {
  findByMapId,
  insertMany
};
