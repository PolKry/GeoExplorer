const express = require('express');

const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/me', auth, userController.me);
router.get('/me/account', auth, userController.account);
router.get('/me/dashboard', auth, userController.dashboard);
router.get('/me/favorite-maps', auth, userController.favoriteMaps);
router.get('/me/highest-score', auth, userController.highestScore);
router.get('/me/stats', auth, userController.stats);
router.get('/me/settings', auth, userController.getSettings);
router.put('/me/settings', auth, userController.updateSettings);
router.put('/:userId/favorite-map', auth, userController.toggleFavoriteMap); // TODO : Why two different routes for the same action? One with /me and one with /:userId. Should be consistent.
router.put('/:userId/country', auth, userController.updateCountry);
router.put('/:userId/bio', auth, userController.updateBio);
router.get('/:userId/username', auth, userController.username);

module.exports = router;
