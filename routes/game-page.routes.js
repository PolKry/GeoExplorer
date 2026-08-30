const express = require('express');

const gamePageController = require('../controllers/game-page.controller');

const router = express.Router();

router.get('/play/:gameId', gamePageController.play);

module.exports = router;
