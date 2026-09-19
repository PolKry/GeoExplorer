const userRepository = require('../repositories/user.repository');
const userProfileRepository = require('../repositories/user-profile.repository');
const userStatsRepository = require('../repositories/user-stats.repository');
const { getXpForLevel } = require('../utils/user-experience.utils');
const { NotFoundError, ValidationError } = require('../utils/app-error.utils');

async function getMyProfile(userId) {
  const profile = await userProfileRepository.findByUserId(userId);
  if (!profile) {
    throw new NotFoundError("User's profile not found");
  }

  return profile;
}

async function getDashboard(userId) {
  const user = await userRepository.findUserById(userId, { excludePassword: true });
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const profile = await userProfileRepository.findByUserId(userId);
  if (!profile) {
    throw new NotFoundError("User's profile not found");
  }

  const stats = await userStatsRepository.findByUserId(userId);
  if (!stats) {
    throw new NotFoundError("User's stats not found");
  }

  return {
    user: {
      username: user.username,
      createdAt: user.createdAt,
    },
    profile: {
      bio: profile.bio,
      country: profile.country,
    },
    stats: {
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
    }
  };
}

async function getFavoriteMaps(userId) {
  const profile = await userProfileRepository.findByUserId(userId);
  if (!profile) {
    throw new NotFoundError("User's profile not found");
  }

  return profile.favoriteMaps || [];
}

async function getHighestScore(userId, name) {
  const userStats = await userStatsRepository.findByUserId(userId);
  if (!userStats) {
    throw new NotFoundError("User's stats not found");
  }

  return userStats.countryStats.get(name) || { highestScore: 0 };
}

async function getSettings(userId) {
  const user = await userProfileRepository.findByUserId(userId);
  if (!user) {
    throw new NotFoundError("User's profile not found");
  }

  return user.settings;
}

async function updateSettings(userId, settings) {
  const required = ['mapStyle', 'musicVolume', 'sfxVolume', 'soundEnabled', 'fullscreenEnabled'];
  if (required.some((field) => settings[field] === undefined)) {
    throw new ValidationError('All settings are required');
  }

  const user = await userProfileRepository.findByUserId(userId);
  if (!user) {
    throw new NotFoundError("User's profile not found");
  }

  user.settings = settings;
  await user.save();
  return user.settings;
}

async function toggleFavoriteMap(userId, mapName) {
  if (!mapName) {
    throw new ValidationError('Country name is required');
  }

  const user = await userProfileRepository.findFavoriteMap(userId, mapName);
  const update = user
    ? { $pull: { favoriteMaps: mapName } }
    : { $addToSet: { favoriteMaps: mapName } };

  return userProfileRepository.findByIdAndUpdate(userId, update, { new: true });
}

async function updateCountry(userId, country) {
  if (!country.name || !country.code) {
    throw new ValidationError('Country name and code are required');
  }

  const user = await userProfileRepository.findById(userId);
  if (!user) {
    throw new NotFoundError("User's profile not found");
  }

  user.country = country;
  await user.save();
  return user.country;
}

async function updateBio(userId, bio) {
  if (!bio) {
    throw new ValidationError('Bio is required');
  }

  const user = await userProfileRepository.findById(userId);
  if (!user) {
    throw new NotFoundError("User's profile not found");
  }

  user.bio = bio;
  await user.save();
  return user.bio;
}

async function getUsername(userId) {
  const user = await userProfileRepository.findByUserId(userId);
  if (!user) {
    throw new NotFoundError("User's profile not found");
  }
  return user.username;
}

async function getStats(userId) {
  const stats = await userStatsRepository.findByUserId(userId);
  if (!stats) {
    throw new NotFoundError("User's stats not found");
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
  getDashboard,
  getFavoriteMaps,
  getHighestScore,
  getSettings,
  updateSettings,
  toggleFavoriteMap,
  updateCountry,
  updateBio,
  getUsername,
  getStats
};
