const jwt = require('jsonwebtoken');

const mapRepository = require('../repositories/map.repository');
const tagRepository = require('../repositories/tag.repository');
const userRepository = require('../repositories/user.repository');
const locationDataRepository = require('../repositories/location-data.repository');

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);
}

async function getAuthorFromToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Valid toke is missing.');
    error.status = 401;
    throw error;
  }

  let decoded;
  try {
    decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
  } catch (err) {
    const error = new Error('Token not valid.');
    error.status = 401;
    throw error;
  }

  if (!decoded.userId) {
    const error = new Error('Token does not contains userId.');
    error.status = 400;
    throw error;
  }

  const user = await userRepository.findUserById(decoded.userId);
  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }

  return user.username || user.email || user._id.toString();
}

async function validateMapPayload({ name, description, difficulty, locations, tags }) {
  if (typeof name !== 'string' || name.length === 0 || name.length > 30) {
    const error = new Error('Unvalid "name": string 1-30 characters.');
    error.status = 400;
    throw error;
  }

  if (typeof description !== 'string' || description.length > 100) {
    const error = new Error('Unvalid "description": max 100 characters.');
    error.status = 400;
    throw error;
  }

  if (!Array.isArray(tags)) {
    const error = new Error('Field "tags" must be an array.');
    error.status = 400;
    throw error;
  }

  if (tags.some((tagName) => typeof tagName !== 'string' || tagName.trim().length === 0)) {
    const error = new Error('Every tag must be a non-empty string.');
    error.status = 400;
    throw error;
  }

  const existingTags = await tagRepository.findNames(tags);
  const existingTagNames = existingTags.map((tag) => tag.name);
  const invalidTags = tags.filter((tag) => !existingTagNames.includes(tag));

  if (invalidTags.length > 0) {
    const error = new Error(`These tags do not exist: ${invalidTags.join(', ')}`);
    error.status = 400;
    throw error;
  }

  if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
    const error = new Error('Unvalid value "difficulty".');
    error.status = 400;
    throw error;
  }

  if (!Array.isArray(locations) || locations.length === 0) {
    const error = new Error('Field "locations" must not be empty.');
    error.status = 400;
    throw error;
  }

  if (!locations.every((loc) => typeof loc.lat === 'number' && typeof loc.lng === 'number')) {
    const error = new Error('Every location has to have number values "lat" a "lng".');
    error.status = 400;
    throw error;
  }

  const existing = await mapRepository.findExistingByName(name);
  if (existing) {
    const error = new Error('Map with this name already exists.');
    error.status = 400;
    throw error;
  }
}

async function createCommunityMap(authHeader, payload) {
  const author = await getAuthorFromToken(authHeader);
  await validateMapPayload(payload);

  const { name, description, difficulty, locations, tags } = payload;
  const newMap = mapRepository.build({
    name,
    description,
    difficulty,
    author,
    image: `/Resources/Images/Maps/Unofficial/CommunityMapIcon${getRandomInt(1, 22)}.png`,
    date: new Date().toISOString().split('T')[0],
    type: 'Community',
    tags,
    srcName: name
  });

  const locationDocs = locations.map((location) => ({
    mapId: newMap._id,
    panoId: location.panoId,
    loc: {
      type: 'Point',
      coordinates: [location.lng, location.lat]
    },
    heading: location.heading ?? 0
  }));

  await locationDataRepository.insertMany(locationDocs, { ordered: false });
  await mapRepository.save(newMap);
  return newMap;
}

module.exports = {
  createCommunityMap
};
