const express = require('express');

const tagController = require('../controllers/tag.controller');

const router = express.Router();

router.get('/description', tagController.description);
router.get('/all', tagController.all);

module.exports = router;
