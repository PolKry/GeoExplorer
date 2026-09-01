const mapRepository = require('../repositories/map.repository');
const locationDataRepository = require('../repositories/location-data.repository');
const userProfileRepository = require('../repositories/user-profile.repository');
const mapFileRepository = require('../repositories/map-file.repository');
const { ValidationError, NotFoundError } = require('../utils/app-error.utils');

const PAGE_SIZE = 12;

function getPageInfo(page) {
  const parsedPage = parseInt(page, 10) || 1;
  return {
    page: parsedPage,
    pageSize: PAGE_SIZE,
    skip: (parsedPage - 1) * PAGE_SIZE
  };
}

async function getMaps(page) {
  const { pageSize, skip } = getPageInfo(page);
  const [maps, total] = await Promise.all([
    mapRepository.findPaginated({}, { skip, limit: pageSize }),
    mapRepository.count()
  ]);
  return { maps, hasMore: skip + pageSize < total };
}

async function getAllMaps() {
  const [officialMaps, communityMaps] = await Promise.all([
    mapRepository.findPublic({ type: { $ne: 'Community' } }),
    mapRepository.findPublic({ type: 'Community' })
  ]);
  return { officialMaps, communityMaps };
}

async function searchMaps({ userId, query = '', type = '', onlyFavMaps = false }) {
  const profile = await userProfileRepository.findByUserId(userId);
  const filter = { type };

  if (onlyFavMaps && profile?.favoriteMaps?.length > 0) {
    filter.name = { $in: profile.favoriteMaps };
    if (query) {
      filter.name.$in = profile.favoriteMaps.filter((name) =>
        name.toLowerCase().includes(query.toLowerCase())
      );
    }
  } else {
    filter.name = { $regex: query, $options: 'i' };
  }

  return { maps: await mapRepository.findPublic(filter) };
}

async function getMapData({ id, map }) {
  if (!id && !map) {
    throw new ValidationError('Missing id or map parameter');
  }

  const mapData = id
    ? await mapRepository.findById(id)
    : await mapRepository.findByName(map);

  if (!mapData) {
    throw new NotFoundError('Map not found');
  }

  // Build the tags array with descriptions
  mapData.tags = await mapRepository.getTagDescriptions(
    mapData.tags || []
  );
  
  // Fetch location data for community maps or fallback codes for official maps
  if (mapData.type === 'Community') {
    mapData.locations = await locationDataRepository.findByMapId(mapData._id);
  } else if (mapData.fallbackFile) {
    const fallback = mapFileRepository.readLocationFallback(mapData.fallbackFile);
    mapData.codes = Array.isArray(fallback?.includes) ? fallback.includes : [];
  }

  if (mapData.category === 'Community' || mapData.type === 'Community') {
    mapData.locations = await locationDataRepository.findByMapId(mapData._id);
  } else if (mapData.fallbackFile) {
    const fallback = mapFileRepository.readLocationFallback(mapData.fallbackFile);
    mapData.codes = Array.isArray(fallback?.includes) ? fallback.includes : [];
  }

  return mapData;
}

async function getCommunityMaps(page) {
  const { pageSize, skip } = getPageInfo(page);
  const filter = { type: 'Community' };
  const [maps, total] = await Promise.all([
    mapRepository.findPaginated(filter, { skip, limit: pageSize }),
    mapRepository.count(filter)
  ]);
  return { maps, hasMore: skip + pageSize < total };
}

async function searchCommunityMaps(query = '') {
  return {
    maps: await mapRepository.findPublic({
      type: 'Community',
      name: { $regex: query, $options: 'i' }
    })
  };
}

module.exports = {
  getMaps,
  getAllMaps,
  searchMaps,
  getMapData,
  getCommunityMaps,
  searchCommunityMaps
};
