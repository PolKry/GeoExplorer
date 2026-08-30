const userProfileRepository = require('../repositories/user-profile.repository');
const userStatsRepository = require('../repositories/user-stats.repository');
const { getXpForLevel } = require('../utils/user-experience.utils');

async function getMyProfile(userId) {
  const profile = await userProfileRepository.findByUserId(userId);
  if (!profile) {
    const error = new Error('Profile not found');
    error.status = 404;
    throw error;
  }
  return profile;
}

async function getHighestScore(userId, name) {
  const userStats = await userStatsRepository.findByUserId(userId);
  if (!userStats) {
    const error = new Error('UserStats not found');
    error.status = 404;
    throw error;
  }

  return userStats.countryStats.get(name) || { highestScore: 0 };
}

async function updateSettings(userId, settings) {
  const required = ['mapStyle', 'musicVolume', 'sfxVolume', 'soundEnabled', 'fullscreenEnabled'];
  if (required.some((field) => settings[field] === undefined)) {
    const error = new Error('All settings are required');
    error.status = 400;
    throw error;
  }

  const user = await userProfileRepository.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  user.settings = settings;
  await user.save();
  return user.settings;
}

async function toggleFavoriteMap(userId, mapName) {
  if (!mapName) {
    const error = new Error('Country name is required');
    error.status = 400;
    throw error;
  }

  const user = await userProfileRepository.findFavoriteMap(userId, mapName);
  const update = user
    ? { $pull: { favoriteMaps: mapName } }
    : { $addToSet: { favoriteMaps: mapName } };

  return userProfileRepository.findByIdAndUpdate(userId, update, { new: true });
}

async function updateCountry(userId, country) {
  if (!country.name || !country.code) {
    const error = new Error('Country name and code are required');
    error.status = 400;
    throw error;
  }

  const user = await userProfileRepository.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  user.country = country;
  await user.save();
  return user.country;
}

async function updateBio(userId, bio) {
  if (!bio) {
    const error = new Error('Bio is required');
    error.status = 400;
    throw error;
  }

  const user = await userProfileRepository.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  user.bio = bio;
  await user.save();
  return user.bio;
}

async function getUsername(userId) {
  const user = await userProfileRepository.findByUserId(userId);
  if (!user) {
    const error = new Error('Profile not found');
    error.status = 404;
    throw error;
  }
  return user.username;
}

async function getStats(userId) {
  const stats = await userStatsRepository.findByUserId(userId);
  if (!stats) {
    const error = new Error('User stats not found');
    error.status = 404;
    throw error;
  }

  return {
    gamesPlayed: stats.gamesPlayed,
    averageScore: stats.averageScore,
    maxScore: stats.maxScore,
    currentStreak: stats.currentStreak,
    longestStreak: stats.longestStreak,
    accuracy: stats.accuracy,
    level: stats.level,
    xp: stats.xp,
    xpToNextLevel: getXpForLevel(stats.level),
    lastUpdated: stats.lastUpdated,
    countryStats: Object.fromEntries(stats.countryStats)
  };
}

module.exports = {
  getMyProfile,
  getHighestScore,
  updateSettings,
  toggleFavoriteMap,
  updateCountry,
  updateBio,
  getUsername,
  getStats
};
