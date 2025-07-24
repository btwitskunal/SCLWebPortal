const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');
const { requireAuth, requirePermission, requireAnyPermission } = require('../middleware/auth');

// Data analysis endpoints (both DO and Admin can access)
router.get('/data', requireAuth, requirePermission('data.read'), analysisController.getData);
router.post('/summary', requireAuth, requirePermission('analysis.basic'), analysisController.getSummary);

module.exports = router; 