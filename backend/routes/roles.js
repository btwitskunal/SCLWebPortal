const express = require('express');
const router = express.Router();
const RoleController = require('../controllers/roleController');
const { 
  requireAuth, 
  requirePermission, 
  requireAnyPermission 
} = require('../middleware/auth');

// Apply authentication to all role routes
router.use(requireAuth);

// Get all roles (requires role.read permission)
router.get('/', requirePermission('role.read'), RoleController.getAllRoles);

// Get single role by ID (requires role.read permission)
router.get('/:id', requirePermission('role.read'), RoleController.getRoleById);

// Create new role (requires role.create permission)
router.post('/', requirePermission('role.create'), RoleController.createRole);

// Update role (requires role.update permission)
router.put('/:id', requirePermission('role.update'), RoleController.updateRole);

// Delete role (requires role.delete permission)
router.delete('/:id', requirePermission('role.delete'), RoleController.deleteRole);

// Get all permissions (requires role.read or role.manage_permissions)
router.get('/permissions/all', 
  requireAnyPermission(['role.read', 'role.manage_permissions']), 
  RoleController.getAllPermissions
);

module.exports = router;