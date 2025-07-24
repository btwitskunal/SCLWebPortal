const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');
const { requireAuth, requirePermission } = require('../middleware/auth');

// Template endpoints (require authentication and appropriate permissions)
router.get('/download', requireAuth, requirePermission('template.download'), templateController.downloadTemplate);
router.get('/', requireAuth, requirePermission('template.read'), templateController.getTemplate);
router.post('/update', requireAuth, requirePermission('template.update'), templateController.updateTemplate);

module.exports = router; 