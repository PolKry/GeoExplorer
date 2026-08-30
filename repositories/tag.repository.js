const Tag = require('../models/tag.model');

function findByName(name) {
  return Tag.findOne({ name });
}

function findAllPublic() {
  return Tag.find({}).select('name color description -_id');
}

function findNames(names) {
  return Tag.find({ name: { $in: names } }).select('name').lean();
}

module.exports = {
  findByName,
  findAllPublic,
  findNames
};
