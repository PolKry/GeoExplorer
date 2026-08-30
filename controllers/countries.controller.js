const countriesService = require('../services/countries.service');
const { sendError } = require('./response.controller');

function index(req, res) {
  try {
    res.json(countriesService.getCountries());
  } catch (error) {
    sendError(res, error);
  }
}

function preview(req, res) {
  try {
    res.json(countriesService.getPreviewCountries());
  } catch (error) {
    sendError(res, error);
  }
}

module.exports = {
  index,
  preview
};
