const MapModel = require('../models/map.model');
const TagModel = require('../models/tag.model');

const PUBLIC_MAP_FIELDS = '-locationDataId -__v';

function findPaginated(filter = {}, { skip = 0, limit = 12 } = {}) {
  return MapModel.find(filter)
    .select(PUBLIC_MAP_FIELDS)
    .skip(skip)
    .limit(limit)
    .lean();
}

function count(filter = {}) {
  return MapModel.countDocuments(filter);
}

function findPublic(filter = {}) {
  return MapModel.find(filter)
    .select(PUBLIC_MAP_FIELDS)
    .lean();
}

function findById(id) {
  return MapModel.findById(id).lean();
}

function findByCode(srcName) {
  return MapModel.findOne({ srcName }).lean();
}

function findByName(name) {
  return MapModel.findOne({ name }).lean();
}

function findExistingByName(name) {
  return MapModel.findOne({ name });
}

function findCountryLookupRows() {
  return MapModel.find({}, { srcName: 1, name: 1, _id: 0 }).lean();
}

function findDocumentById(id) {
  return MapModel.findById(id);
}

function build(doc) {
  return new MapModel(doc);
}

function save(map) {
  return map.save();
}

async function getTagDescriptions(tagNames) {
  if (!tagNames.length) {
    return [];
  }

  const tags = await TagModel.find(
    { name: { $in: tagNames } },
    { _id: 0, name: 1, description: 1 }
  ).lean();

  const descriptions = new Map(
    tags.map(tag => [tag.name, tag.description])
  );

  return tagNames.map(name => ({
    name,
    description: descriptions.get(name) ?? null
  }));
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
  save,
  getTagDescriptions
};
