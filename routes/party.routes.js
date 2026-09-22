const express = require('express');

const partyController = require('../controllers/party.controller');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/create', auth, partyController.create);
router.post('/end', auth, partyController.end);
router.post('/join', auth, partyController.join);
router.post('/:partyId/join', auth, partyController.joinById);
router.post('/leave', auth, partyController.leave);
router.post('/:partyId/start', auth, partyController.start);
router.post('/:partyId/swap-player', auth, partyController.swapPlayer);
router.post('/:partyId/kick-player', auth, partyController.kickPlayer);
router.post('/:partyId/kick-offline', auth, partyController.kickOffline);
router.post('/:partyId/terminate-game', auth, partyController.terminateGame);
router.post('/:partyId/settings', auth, partyController.settings);
router.get('/:partyId', auth, partyController.show);

module.exports = router;
