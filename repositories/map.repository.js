const Map = require('../models/map.model');

const PUBLIC_MAP_FIELDS = '-locationDataId -__v';

function findPaginated(filter = {}, { skip = 0, limit = 12 } = {}) {
  return Map.find(filter)
    .select(PUBLIC_MAP_FIELDS)
    .skip(skip)
    .limit(limit)
    .lean();
}

function count(filter = {}) {
  return Map.countDocuments(filter);
}

function findPublic(filter = {}) {
  return Map.find(filter)
    .select(PUBLIC_MAP_FIELDS)
    .lean();
}

function findById(id) {
  return Map.findById(id).lean();
}

function findByCode(srcName) {
  return Map.findOne({ srcName }).lean();
}

function findByName(name) {
  return Map.findOne({ name }).lean();
}

function findExistingByName(name) {
  return Map.findOne({ name });
}

function findCountryLookupRows() {
  return Map.find({}, { srcName: 1, name: 1, _id: 0 }).lean();
}

function findDocumentById(id) {
  return Map.findById(id);
}

function build(doc) {
  return new Map(doc);
}

function save(map) {
  return map.save();
}

module.exports = {
  findPaginated,
  count,
  findPublic,
  findById,
  findByCode,
  findByName,
  findExistingByName,
  findCountryLookupRows,
  findDocumentById,
  build,
  save
};
