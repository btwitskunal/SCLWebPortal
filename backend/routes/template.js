const express = require('express');
const router = express.Router();
const templateController = require('../controllers/templateController');

router.get('/download', templateController.downloadTemplate);
router.get('/', templateController.getTemplate);
router.post('/update', templateController.updateTemplate);

module.exports = router; 