const mapCreationService = require('../services/map-creation.service');
const { sendError } = require('./response.controller');

async function validateJson(req, res) {
  try {
    const map = await mapCreationService.createCommunityMap(req.headers.authorization, req.body);
    res.status(200).json({ message: 'Map sucesfully saved.', name: map.name });
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    console.error(error);
    return res.status(500).send('Chyba serveru.');
  }
}

module.exports = {
  validateJson
};
