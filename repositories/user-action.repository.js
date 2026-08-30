const UserAction = require('../models/user-action.model');

function findByUserId(userId) {
  return UserAction.findOne({ userId });
}

module.exports = {
  findByUserId
};
