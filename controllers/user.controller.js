const userService = require('../services/user.service');
const { sendError } = require('./response.controller');

async function me(req, res) {
  try {
    res.json(await userService.getMyProfile(req.user.userId));
  } catch (error) {
    sendError(res, error);
  }
}

async function account(req, res) {
  try {
    res.json(await userService.getAccount(req.user.userId));
  } catch (error) {
    sendError(res, error);
  }
}

async function dashboard(req, res) {
  try {
    res.json(await userService.getDashboard(req.user.userId));
  } catch (error) {
    sendError(res, error);
  }
}

async function favoriteMaps(req, res) {
  try {
    console.log('Fetching favorite maps for user:', req.user.userId); // Debugging line
    res.json(await userService.getFavoriteMaps(req.user.userId));
  } catch (error) {
    sendError(res, error);
  }
}

async function highestScore(req, res) {
  try {
    res.json(await userService.getHighestScore(req.user.userId, req.query.name));
  } catch (error) {
    sendError(res, error);
  }
}

async function getSettings(req, res) {
  try {
    const settings = await userService.getSettings(req.user.userId);
    res.json(settings);
  } catch (error) {
    sendError(res, error, 'Server error fetching settings');
  }
}

async function updateSettings(req, res) {
  try {
    const settings = await userService.updateSettings(req.user.userId, req.body);
    res.json({ message: 'Settings updated', settings });
  } catch (error) {
    sendError(res, error, 'Server error updating settings');
  }
}

async function toggleFavoriteMap(req, res) {
  try {
    const updatedUser = await userService.toggleFavoriteMap(req.params.userId, req.body.name);
    res.json({ message: 'Country added to favorites', country: updatedUser.country });
  } catch (error) {
    sendError(res, error, 'Server error updating country');
  }
}

async function updateCountry(req, res) {
  try {
    const country = await userService.updateCountry(req.params.userId, req.body);
    res.json({ message: 'Country updated', country });
  } catch (error) {
    sendError(res, error, 'Server error updating country');
  }
}

async function updateBio(req, res) {
  try {
    const bio = await userService.updateBio(req.params.userId, req.body.bio);
    res.json({ message: 'Bio updated', bio });
  } catch (error) {
    sendError(res, error, 'Server error updating BIO');
  }
}

async function username(req, res) {
  try {
    res.json(await userService.getUsername(req.params.userId));
  } catch (error) {
    sendError(res, error);
  }
}

async function stats(req, res) {
  try {
    res.json(await userService.getStats(req.user.userId));
  } catch (error) {
    sendError(res, error, 'Internal server error');
  }
}

module.exports = {
  me,
  account,
  dashboard,
  favoriteMaps,
  highestScore,
  getSettings,
  updateSettings,
  toggleFavoriteMap,
  updateCountry,
  updateBio,
  username,
  stats
};
