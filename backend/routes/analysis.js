const express = require('express');
const router = express.Router();
const analysisController = require('../controllers/analysisController');
const { requireAuth, requirePermission, requireAnyPermission } = require('../middleware/auth');

// Data analysis endpoints (require authentication and appropriate permissions)
router.get('/data', requireAuth, requirePermission('data.read'), analysisController.getData);
router.post('/summary', requireAuth, requireAnyPermission(['analysis.basic', 'analysis.advanced']), analysisController.getSummary);

module.exports = router; 