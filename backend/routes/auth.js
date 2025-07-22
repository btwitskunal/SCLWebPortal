const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/login', authController.login);
router.get('/callback', authController.callback);
router.get('/logout', authController.logout);

// Protected test route
router.get('/protected', (req, res) => {
  if (req.isAuthenticated()) {
    res.send('You are authenticated');
  } else {
    res.status(401).send('Not authenticated');
  }
});

// User profile endpoint
router.get('/profile', (req, res) => {
  if (req.isAuthenticated() && req.user) {
    res.json({
      displayName: req.user.displayName || req.user.name || req.user.email || 'User',
      email: req.user._json && req.user._json.email || req.user.email
    });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

module.exports = router; 