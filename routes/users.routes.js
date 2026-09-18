const express = require('express');

const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/me', auth, userController.me);
router.get('/me/favorite-maps', auth, userController.favoriteMaps);
router.get('/highest-score', auth, userController.highestScore);
router.put('/:userId/settings', auth, userController.updateSettings);
router.put('/:userId/favorite-map', auth, userController.toggleFavoriteMap);
router.put('/:userId/country', auth, userController.updateCountry);
router.put('/:userId/bio', auth, userController.updateBio);
router.get('/:userId/username', auth, userController.username);
router.get('/stats', auth, userController.stats);

module.exports = router;
