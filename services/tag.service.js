const tagRepository = require('../repositories/tag.repository');

async function getDescription(tagName) {
  if (!tagName) {
    const error = new Error('Tag name is required as a query parameter "name"');
    error.status = 400;
    throw error;
  }

  const tag = await tagRepository.findByName(tagName);
  if (!tag) {
    console.log(tagName);
    const error = new Error('Tag not found');
    error.status = 404;
    throw error;
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
