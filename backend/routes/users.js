const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { 
  requireAuth, 
  requirePermission, 
  requireAnyPermission 
} = require('../middleware/auth');

// Apply authentication to all user routes
router.use(requireAuth);

// Get current user profile (no special permission required)
router.get('/me', UserController.getCurrentUser);

// Get all users (requires user.read permission)
router.get('/', requirePermission('user.read'), UserController.getAllUsers);

// Get user statistics (requires user.read permission)
router.get('/stats', requirePermission('user.read'), UserController.getUserStats);

// Get available roles for assignment (requires user.manage_roles permission)
router.get('/roles/available', requirePermission('user.manage_roles'), UserController.getAvailableRoles);

// Get user by ID (requires user.read permission)
router.get('/:id', requirePermission('user.read'), UserController.getUserById);

// Update user role (requires user.manage_roles permission)
router.put('/:id/role', requirePermission('user.manage_roles'), UserController.updateUserRole);

// Update user status (requires user.update permission)
router.put('/:id/status', requirePermission('user.update'), UserController.updateUserStatus);

// Bulk update user roles (requires user.manage_roles permission)
router.post('/bulk/roles', requirePermission('user.manage_roles'), UserController.bulkUpdateUserRoles);

module.exports = router;