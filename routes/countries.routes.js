const express = require('express');

const countriesController = require('../controllers/countries.controller');
const countriesService = require('../services/countries.service');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

setInterval(countriesService.fetchCountries, 24 * 60 * 60 * 1000);

router.get('/', auth, countriesController.index);
router.get('/prev-countries', auth, countriesController.preview);

module.exports = router;