const jwt = require('jsonwebtoken');

const mapRepository = require('../repositories/map.repository');
const tagRepository = require('../repositories/tag.repository');
const userRepository = require('../repositories/user.repository');
const locationDataRepository = require('../repositories/location-data.repository');
const { AuthError, ValidationError, NotFoundError, ConflictError } = require('../utils/app-error.utils');

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);
}

async function getAuthorFromToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Valid token is missing.');
  }

  let decoded;
  try {
    decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
  } catch (err) {
    throw new AuthError('Token not valid.');
  }

  if (!decoded.userId) {
    throw new ValidationError('Token does not contains userId.');
  }

  const user = await userRepository.findUserById(decoded.userId);
  if (!user) {
    throw new NotFoundError('User not found.');
  }

  return user.username || user.email || user._id.toString();
}

async function validateMapPayload({ name, description, difficulty, locations, tags }) {
  if (typeof name !== 'string' || name.length === 0 || name.length > 30) {
    throw new ValidationError('Unvalid "name": string 1-30 characters.');
  }

  if (typeof description !== 'string' || description.length > 100) {
    throw new ValidationError('Unvalid "description": max 100 characters.');
  }

  if (!Array.isArray(tags)) {
    throw new ValidationError('Field "tags" must be an array.');
  }

  if (tags.some((tagName) => typeof tagName !== 'string' || tagName.trim().length === 0)) {
    throw new ValidationError('Every tag must be a non-empty string.');
  }

  const existingTags = await tagRepository.findNames(tags);
  const existingTagNames = existingTags.map((tag) => tag.name);
  const invalidTags = tags.filter((tag) => !existingTagNames.includes(tag));

  if (invalidTags.length > 0) {
    throw new ValidationError(`These tags do not exist: ${invalidTags.join(', ')}`);
  }

  if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) {
    throw new ValidationError('Unvalid value "difficulty".');
  }

  if (!Array.isArray(locations) || locations.length === 0) {
    throw new ValidationError('Field "locations" must not be empty.');
  }

  if (!locations.every((loc) => typeof loc.lat === 'number' && typeof loc.lng === 'number')) {
    throw new ValidationError('Every location has to have number values "lat" a "lng".');
  }

  const existing = await mapRepository.findExistingByName(name);
  if (existing) {
    throw new ConflictError('Map with this name already exists.');
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
