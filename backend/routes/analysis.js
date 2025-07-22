const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');

router.get('/data', analysisController.getData);
router.post('/summary', analysisController.getSummary);

module.exports = router; 