const express = require('express');
const path = require('path');

const gamePageController = require('../controllers/game-page.controller');

const router = express.Router();

router.get('/play/:gameId', gamePageController.play);
router.get('/party/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'party', 'dashboard.html'));
});

router.get('/party/:partyId', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'party', 'dashboard.html'));
});

// Preserve existing bookmarks while keeping the browser-facing name dashboard.
router.get('/party/create.html', (req, res) => {
  res.redirect(301, '/party/dashboard');
});

module.exports = router;
