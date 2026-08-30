const tagService = require('../services/tag.service');
const { sendError } = require('./response.controller');

async function description(req, res) {
  try {
    res.type('text/plain').send(await tagService.getDescription(req.query.name));
  } catch (error) {
    sendError(res, error, 'Internal server error');
  }
}

async function all(req, res) {
  try {
    res.json(await tagService.getAllTags());
  } catch (error) {
    sendError(res, error, 'Internal server error');
  }
}

module.exports = {
  description,
  all
};
