const express = require('express');

const mapCreationController = require('../controllers/map-creation.controller');

const router = express.Router();

router.use(express.json({ limit: '10mb' }));
router.post('/validate-json', mapCreationController.validateJson);

module.exports = router;
