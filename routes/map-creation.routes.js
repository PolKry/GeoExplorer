const express = require('express');

const mapCreationController = require('../controllers/map-creation.controller');

const router = express.Router();

router.use(express.json({ limit: '10mb' }));
// TODO: Add separate routes
router.post('/validate-json', mapCreationController.validateJson);

module.exports = router;
