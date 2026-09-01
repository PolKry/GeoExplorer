const tagRepository = require('../repositories/tag.repository');
const { ValidationError, NotFoundError } = require('../utils/app-error.utils');

async function getDescription(tagName) {
  if (!tagName) {
    throw new ValidationError('Tag name is required as a query parameter "name"');
  }

  const tag = await tagRepository.findByName(tagName);
  if (!tag) {
    console.log(tagName);
    throw new NotFoundError('Tag not found');
  }

  return tag.description;
}

function getAllTags() {
  return tagRepository.findAllPublic();
}

module.exports = {
  getDescription,
  getAllTags
};
