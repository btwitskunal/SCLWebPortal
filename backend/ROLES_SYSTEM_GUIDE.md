# 🔐 Roles & Privileges System Guide

## Overview

Your portal now includes a comprehensive role-based access control (RBAC) system that provides fine-grained permissions management for different user types and activities.

## 🏗️ System Architecture

### Database Tables
- **`users`** - Stores user information from Azure AD
- **`roles`** - Defines different user roles
- **`permissions`** - Granular permissions for specific actions
- **`role_permissions`** - Maps permissions to roles

### Key Components
- **UserService** - Handles user management and permission checking
- **Auth Middleware** - Enforces authentication and authorization
- **Role/User Controllers** - Manage roles and users via API

## 🎭 Roles

| Role | Description | Capabilities |
|------|-------------|--------------|
| **DO** | District Officer | Upload files, download filtered data, analyze data, generate reports |
| **Admin** | Admin/Sales Executive | Download filtered data, analyze data, generate reports (no upload) |

## 🔑 Permission System

### Permission Format: `resource.action`

### Resources & Actions

#### Data Management (`data.*`)
- `data.upload` - Upload data files (DO only)
- `data.read` - View uploaded data
- `data.download` - Download filtered data
- `data.filter` - Apply filters to data

#### Analysis (`analysis.*`)
- `analysis.basic` - Basic data analysis
- `analysis.advanced` - Advanced analytics
- `analysis.reports` - Generate reports

#### Template Management (`template.*`)
- `template.read` - View templates
- `template.download` - Download templates

## 🚀 Setup Instructions

### 1. Run the Setup Script
```bash
cd backend
npm run setup-roles
```

### 2. Assign DO Role (Optional)
Add to your `.env` file:
```env
DO_EMAIL=do-user@domain.com
```

Then run setup again:
```bash
npm run setup-roles
```

Note: New users default to Admin role. You can manually assign DO role later.

### 3. Start the Application
```bash
npm start
```

## 📡 API Endpoints

### Authentication
- `GET /auth/profile` - Get current user profile with permissions

### Data Operations
- `GET /data/summary` - Get data summary for filtering UI (both roles)
- `POST /data/count` - Get filtered data count preview (both roles)
- `POST /data/download` - Download filtered data as Excel/JSON (both roles)

### File Operations
- `POST /upload` - Upload data files (DO only)
- `GET /template` - Get template structure (both roles)
- `GET /template/download` - Download template file (both roles)

### Analysis
- `GET /analysis/data` - View uploaded data (both roles)
- `POST /analysis/summary` - Perform data analysis (both roles)

## 🛡️ Using Middleware

### Authentication Middleware
```javascript
const { requireAuth } = require('./middleware/auth');
router.use(requireAuth); // Require authentication for all routes
```

### Permission-Based Authorization
```javascript
const { requirePermission } = require('./middleware/auth');
router.get('/data', requirePermission('data.read'), controller.getData);
```

### Role-Based Authorization
```javascript
const { requireRole } = require('./middleware/auth');
router.get('/admin', requireRole('admin'), controller.adminOnly);
```

### Multiple Permissions
```javascript
const { requireAllPermissions, requireAnyPermission } = require('./middleware/auth');

// User must have ALL permissions
router.post('/critical', requireAllPermissions(['data.delete', 'system.configure']));

// User must have ANY of these permissions
router.get('/reports', requireAnyPermission(['analysis.basic', 'analysis.advanced']));
```

## 🔧 Customization

### Adding New Roles
```javascript
// Via API
POST /roles
{
  "name": "custom_role",
  "description": "Custom role description",
  "permissions": [1, 2, 3] // Permission IDs
}
```

### Adding New Permissions
```sql
INSERT INTO permissions (name, description, resource, action) 
VALUES ('custom.action', 'Custom action description', 'custom', 'action');
```

### Checking Permissions in Code
```javascript
const UserService = require('./utils/userService');

// Check specific permission
const hasPermission = await UserService.hasPermission(userId, 'data.upload');

// Check resource-action permission
const canUpload = await UserService.hasResourcePermission(userId, 'data', 'upload');

// Get all user permissions
const permissions = await UserService.getUserPermissions(userId);
```

## 🏃‍♂️ Migration from Old System

Your existing system is automatically upgraded:

1. **Database tables** are created automatically on startup
2. **Default roles and permissions** are inserted
3. **New users** get the 'user' role by default
4. **Existing routes** are protected with appropriate permissions

## 🔍 Troubleshooting

### Common Issues

#### "Permission Required" Error
- Check if user has the correct role assigned
- Verify the role has the required permissions
- Check if user account is active

#### "User Not Found" Error
- User needs to login via Azure AD first
- Check database connection
- Verify user exists in users table

#### Database Errors
- Ensure MySQL is running
- Check database credentials in .env
- Run setup script: `npm run setup-roles`

### Useful SQL Queries

```sql
-- Check user permissions
SELECT u.email, r.name as role, p.name as permission
FROM users u
JOIN roles r ON u.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.email = 'user@example.com';

-- Make user super admin
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'super_admin') 
WHERE email = 'admin@example.com';

-- Check role permissions
SELECT r.name as role, p.name as permission, p.description
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'admin'
ORDER BY p.resource, p.action;
```

## 🎯 Best Practices

1. **Principle of Least Privilege** - Give users minimum permissions needed
2. **Regular Audits** - Review user roles and permissions periodically
3. **Role Hierarchy** - Use role inheritance where possible
4. **Permission Naming** - Follow `resource.action` convention
5. **Testing** - Test permission changes in development first
6. **Documentation** - Keep role definitions updated

## 🔮 Future Enhancements

Potential improvements you can add:

- **Time-based permissions** (temporary access)
- **IP-based restrictions**
- **Multi-factor authentication integration**
- **Audit logging** for permission changes
- **Dynamic permissions** based on data ownership
- **Permission inheritance** from organizational structure

## 📞 Support

For questions or issues with the role system:

1. Check this documentation
2. Review the troubleshooting section
3. Check database logs and application logs
4. Test with a super admin account first

---

*This role system provides enterprise-grade access control for your data portal. Start with the default setup and customize as needed for your organization's requirements.*