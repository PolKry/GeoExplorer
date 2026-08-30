const UserProfile = require('../models/user-profile.model');

function findByUserId(userId) {
  return UserProfile.findOne({ userId });
}

function findById(userId) {
  return UserProfile.findById(userId);
}

function findByIdAndUpdate(userId, update, options = {}) {
  return UserProfile.findByIdAndUpdate(userId, update, options);
}

function findOneAndUpdate(filter, update, options = {}) {
  return UserProfile.findOneAndUpdate(filter, update, options);
}

function updateMany(filter, update) {
  return UserProfile.updateMany(filter, update);
}

function findFavoriteMap(userId, mapName) {
  return UserProfile.findOne({ _id: userId, favoriteMaps: mapName });
}

module.exports = {
  findByUserId,
  findById,
  findByIdAndUpdate,
  findOneAndUpdate,
  updateMany,
  findFavoriteMap
};
