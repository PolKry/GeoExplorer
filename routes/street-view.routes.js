const express = require('express');

const streetViewController = require('../controllers/street-view.controller');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/country/:iso', auth, streetViewController.country);

module.exports = router;
