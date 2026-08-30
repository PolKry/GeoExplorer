const mapService = require('../services/map.service');
const { sendError } = require('./response.controller');

function tags(req, res) {
  res.json('/data/mapTags.json');
}

async function index(req, res) {
  try {
    res.json(await mapService.getMaps(req.query.page));
  } catch (error) {
    sendError(res, error, 'Failed to fetch maps');
  }
}

async function all(req, res) {
  try {
    res.json(await mapService.getAllMaps());
  } catch (error) {
    sendError(res, error, 'Failed to fetch all maps');
  }
}

async function search(req, res) {
  try {
    res.json(await mapService.searchMaps({
      userId: req.user.userId,
      query: req.query.query || '',
      type: req.query.type || '',
      onlyFavMaps: req.query.onlyFavMaps === 'true'
    }));
  } catch (error) {
    sendError(res, error, 'Search failed');
  }
}

async function data(req, res) {
  try {
    res.json(await mapService.getMapData(req.query));
  } catch (error) {
    sendError(res, error, 'Could not fetch map data');
  }
}

async function community(req, res) {
  try {
    res.json(await mapService.getCommunityMaps(req.query.page));
  } catch (error) {
    sendError(res, error, 'Failed to fetch community maps');
  }
}

async function communitySearch(req, res) {
  try {
    res.json(await mapService.searchCommunityMaps(req.query.query || ''));
  } catch (error) {
    sendError(res, error, 'Community maps search failed');
  }
}

module.exports = {
  tags,
  index,
  all,
  search,
  data,
  community,
  communitySearch
};
