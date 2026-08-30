const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');

const gameController = require('../controllers/game.controller');

router.post("/points-mode/start", auth, gameController.startPointsMode);
router.post("/country-mode/start", auth, gameController.startCountryMode);

module.exports = router;