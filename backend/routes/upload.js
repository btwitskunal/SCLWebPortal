const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { requireAuth, requirePermission } = require('../middleware/auth');

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// File filter for Excel files
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname);
  if (ext === '.xlsx' || ext === '.xls') {
    cb(null, true);
  } else {
    cb(new Error('Only .xlsx and .xls files are allowed'), false);
  }
}

const upload = multer({ storage, fileFilter });

// Upload endpoint (requires authentication and data.upload permission)
router.post('/', requireAuth, requirePermission('data.upload'), upload.single('file'), uploadController.uploadFile);

module.exports = router; 