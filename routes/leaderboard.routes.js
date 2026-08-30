const express = require('express');

const leaderboardController = require('../controllers/leaderboard.controller');

const router = express.Router();

router.get('/:map', leaderboardController.allTime);
router.get('/:map/:period', leaderboardController.period);

module.exports = router;
