const express = require('express');

const countriesController = require('../controllers/countries.controller');
const countriesService = require('../services/countries.service');

const router = express.Router();

setInterval(countriesService.fetchCountries, 24 * 60 * 60 * 1000);

router.get('/', countriesController.index);
router.get('/prev-countries', countriesController.preview);

module.exports = router;