const UserService = require('../utils/userService');

// Authentication middleware - checks if user is logged in
const requireAuth = async (req, res, next) => {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      });
    }

    // Get or create user in our database
    const dbUser = await UserService.findOrCreateUser(req.user);
    if (!dbUser || !dbUser.is_active) {
      return res.status(403).json({ 
        error: 'User account is inactive',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Attach user info to request
    req.dbUser = dbUser;
    req.userId = dbUser.id;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

// Permission-based authorization middleware
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
      }

      const hasPermission = await UserService.hasPermission(req.userId, permissionName);
      if (!hasPermission) {
        return res.status(403).json({ 
          error: `Permission '${permissionName}' required`,
          code: 'INSUFFICIENT_PERMISSIONS',
          required_permission: permissionName
        });
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      res.status(500).json({ 
        error: 'Authorization error',
        code: 'AUTH_ERROR'
      });
    }
  };
};

// Resource-based authorization middleware
const requireResourcePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
      }

      const hasPermission = await UserService.hasResourcePermission(req.userId, resource, action);
      if (!hasPermission) {
        return res.status(403).json({ 
          error: `Permission for '${resource}.${action}' required`,
          code: 'INSUFFICIENT_PERMISSIONS',
          required_resource: resource,
          required_action: action
        });
      }

      next();
    } catch (error) {
      console.error('Resource permission middleware error:', error);
      res.status(500).json({ 
        error: 'Authorization error',
        code: 'AUTH_ERROR'
      });
    }
  };
};

// Role-based authorization middleware
const requireRole = (roleName) => {
  return async (req, res, next) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
      }

      const user = await UserService.getUserWithPermissions(req.userId);
      if (!user || user.role_name !== roleName) {
        return res.status(403).json({ 
          error: `Role '${roleName}' required`,
          code: 'INSUFFICIENT_ROLE',
          required_role: roleName,
          current_role: user?.role_name || 'none'
        });
      }

      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({ 
        error: 'Authorization error',
        code: 'AUTH_ERROR'
      });
    }
  };
};

// Multiple permissions middleware (user must have ALL permissions)
const requireAllPermissions = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
      }

      for (const permission of permissions) {
        const hasPermission = await UserService.hasPermission(req.userId, permission);
        if (!hasPermission) {
          return res.status(403).json({ 
            error: `All permissions required: ${permissions.join(', ')}`,
            code: 'INSUFFICIENT_PERMISSIONS',
            required_permissions: permissions,
            missing_permission: permission
          });
        }
      }

      next();
    } catch (error) {
      console.error('Multiple permissions middleware error:', error);
      res.status(500).json({ 
        error: 'Authorization error',
        code: 'AUTH_ERROR'
      });
    }
  };
};

// Any permission middleware (user must have AT LEAST ONE permission)
const requireAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
      }

      for (const permission of permissions) {
        const hasPermission = await UserService.hasPermission(req.userId, permission);
        if (hasPermission) {
          next();
          return;
        }
      }

      return res.status(403).json({ 
        error: `One of these permissions required: ${permissions.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        required_permissions: permissions
      });
    } catch (error) {
      console.error('Any permission middleware error:', error);
      res.status(500).json({ 
        error: 'Authorization error',
        code: 'AUTH_ERROR'
      });
    }
  };
};

// DO role middleware (for upload operations)
const requireDO = requireRole('do');

// Any authenticated user (both DO and Admin)
const requireAnyRole = requireAnyPermission(['data.read', 'data.upload']);

// Middleware to attach user permissions to request
const attachUserPermissions = async (req, res, next) => {
  try {
    if (req.userId) {
      const permissions = await UserService.getUserPermissions(req.userId);
      req.userPermissions = permissions;
    }
    next();
  } catch (error) {
    console.error('Attach permissions middleware error:', error);
    next(); // Continue even if this fails
  }
};

module.exports = {
  requireAuth,
  requirePermission,
  requireResourcePermission,
  requireRole,
  requireAllPermissions,
  requireAnyPermission,
  requireDO,
  requireAnyRole,
  attachUserPermissions
};