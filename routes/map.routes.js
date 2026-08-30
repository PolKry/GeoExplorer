const express = require('express');

const mapController = require('../controllers/map.controller');
const auth = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/tags', mapController.tags);
router.get('/', auth, mapController.index);
router.get('/all', auth, mapController.all);
router.get('/search', auth, mapController.search);
router.get('/data', auth, mapController.data);
router.get('/community', auth, mapController.community);
router.get('/community/search', auth, mapController.communitySearch);

module.exports = router;
