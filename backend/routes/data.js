const express = require('express');
const router = express.Router();
const DataController = require('../controllers/dataController');
const { requireAuth, requirePermission } = require('../middleware/auth');

// Apply authentication to all data routes
router.use(requireAuth);

// Get data summary for filtering UI (both DO and Sales Executive can access)
router.get('/summary', requirePermission('data.read'), DataController.getDataSummary);

// Get filtered data count for preview (both DO and Sales Executive can access)
router.post('/count', requirePermission('data.filter'), DataController.getFilteredCount);

// Download filtered data (both DO and Sales Executive can access)
router.post('/download', requirePermission('data.download'), DataController.downloadData);

module.exports = router;