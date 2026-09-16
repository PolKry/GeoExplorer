const User = require('../models/user.model');
const UserProfile = require('../models/user-profile.model');
const UserStats = require('../models/user-stats.model');
const UserAction = require('../models/user-action.model');

function startSession() {
  return User.startSession();
}

function findUserByEmail(email, options = {}) {
  const query = User.findOne({ email });
  if (options.includePassword) query.select('+password');
  if (options.session) query.session(options.session);
  return query;
}

function findUserByUsername(username) {
  return User.findOne({ username });
}

function findUserById(userId, options = {}) {
  const query = User.findById(userId);
  if (options.includePassword) query.select('+password');
  if (options.excludePassword) query.select('-password');
  if (options.session) query.session(options.session);
  return query;
}

function deleteUserById(userId) {
  return User.findByIdAndDelete(userId);
}

function findUsersByIds(userIds) {
  return User.find({ _id: { $in: userIds } });
}

function createUser(doc, session) {
  return User.create([doc], { session });
}

function createUserStats(doc, session) {
  return UserStats.create([doc], { session });
}

function createUserProfile(doc, session) {
  return UserProfile.create([doc], { session });
}

function createUserAction(doc, session) {
  return UserAction.create([doc], { session });
}

async function createUserAccount({ email, username, password, createdAt, role, isVerified, profileData = {} }, session) {
  const [user] = await createUser({ email, username, password, createdAt, role, isVerified }, session);

  await createUserStats({
    userId: user._id,
    countryStats: {},
    lastUpdated: new Date()
  }, session);

  await createUserProfile({ userId: user._id, ...profileData }, session);
  await createUserAction({ userId: user._id }, session);

  return user;
}

module.exports = {
  startSession,
  findUserByEmail,
  findUserByUsername,
  findUserById,
  findUsersByIds,
  deleteUserById,
  createUserAccount
};
