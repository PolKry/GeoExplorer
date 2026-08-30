const streetViewService = require('../services/street-view.service');
const { sendError } = require('./response.controller');

async function country(req, res) {
  try {
    res.json(await streetViewService.getRandomLocation(req.params.iso));
  } catch (error) {
    sendError(res, error);
  }
}

module.exports = {
  country
};
