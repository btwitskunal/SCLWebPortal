const pool = require('./db');

// Initialize role-based access control tables
async function initializeRoleSystem() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        azure_oid VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(255),
        role_id INT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_azure_oid (azure_oid),
        INDEX idx_email (email),
        INDEX idx_role_id (role_id)
      )
    `);

    // Create roles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create permissions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        resource VARCHAR(100) NOT NULL,
        action VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_resource_action (resource, action)
      )
    `);

    // Create role_permissions junction table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_id INT NOT NULL,
        permission_id INT NOT NULL,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_role_permission (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      )
    `);

    // Add foreign key constraint to users table
    await pool.query(`
      ALTER TABLE users 
      ADD CONSTRAINT fk_user_role 
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL
    `).catch(() => {
      // Constraint might already exist, ignore error
    });

    // Insert default roles
    await insertDefaultRoles();
    
    // Insert default permissions
    await insertDefaultPermissions();
    
    // Assign permissions to default roles
    await assignDefaultRolePermissions();

    console.log('Role system initialized successfully');
  } catch (error) {
    console.error('Error initializing role system:', error);
    throw error;
  }
}

async function insertDefaultRoles() {
  const defaultRoles = [
    { name: 'super_admin', description: 'Super Administrator with full system access' },
    { name: 'admin', description: 'Administrator with management capabilities' },
    { name: 'manager', description: 'Manager with data analysis and team oversight' },
    { name: 'analyst', description: 'Data analyst with read and analysis permissions' },
    { name: 'user', description: 'Basic user with limited upload and view permissions' },
    { name: 'viewer', description: 'Read-only access to data' }
  ];

  for (const role of defaultRoles) {
    await pool.query(
      'INSERT IGNORE INTO roles (name, description) VALUES (?, ?)',
      [role.name, role.description]
    );
  }
}

async function insertDefaultPermissions() {
  const defaultPermissions = [
    // User Management
    { name: 'user.create', description: 'Create new users', resource: 'user', action: 'create' },
    { name: 'user.read', description: 'View user information', resource: 'user', action: 'read' },
    { name: 'user.update', description: 'Update user information', resource: 'user', action: 'update' },
    { name: 'user.delete', description: 'Delete users', resource: 'user', action: 'delete' },
    { name: 'user.manage_roles', description: 'Assign roles to users', resource: 'user', action: 'manage_roles' },

    // Role Management
    { name: 'role.create', description: 'Create new roles', resource: 'role', action: 'create' },
    { name: 'role.read', description: 'View roles', resource: 'role', action: 'read' },
    { name: 'role.update', description: 'Update roles', resource: 'role', action: 'update' },
    { name: 'role.delete', description: 'Delete roles', resource: 'role', action: 'delete' },
    { name: 'role.manage_permissions', description: 'Assign permissions to roles', resource: 'role', action: 'manage_permissions' },

    // Data Management
    { name: 'data.upload', description: 'Upload data files', resource: 'data', action: 'upload' },
    { name: 'data.read', description: 'View uploaded data', resource: 'data', action: 'read' },
    { name: 'data.update', description: 'Update data records', resource: 'data', action: 'update' },
    { name: 'data.delete', description: 'Delete data records', resource: 'data', action: 'delete' },
    { name: 'data.export', description: 'Export data', resource: 'data', action: 'export' },

    // Analysis
    { name: 'analysis.basic', description: 'Perform basic data analysis', resource: 'analysis', action: 'basic' },
    { name: 'analysis.advanced', description: 'Perform advanced analytics', resource: 'analysis', action: 'advanced' },
    { name: 'analysis.reports', description: 'Generate reports', resource: 'analysis', action: 'reports' },

    // Template Management
    { name: 'template.read', description: 'View templates', resource: 'template', action: 'read' },
    { name: 'template.update', description: 'Update templates', resource: 'template', action: 'update' },
    { name: 'template.download', description: 'Download templates', resource: 'template', action: 'download' },

    // System Administration
    { name: 'system.configure', description: 'Configure system settings', resource: 'system', action: 'configure' },
    { name: 'system.logs', description: 'View system logs', resource: 'system', action: 'logs' },
    { name: 'system.backup', description: 'Perform system backups', resource: 'system', action: 'backup' }
  ];

  for (const permission of defaultPermissions) {
    await pool.query(
      'INSERT IGNORE INTO permissions (name, description, resource, action) VALUES (?, ?, ?, ?)',
      [permission.name, permission.description, permission.resource, permission.action]
    );
  }
}

async function assignDefaultRolePermissions() {
  // Define role-permission mappings
  const rolePermissions = {
    'super_admin': [
      // All permissions
      'user.create', 'user.read', 'user.update', 'user.delete', 'user.manage_roles',
      'role.create', 'role.read', 'role.update', 'role.delete', 'role.manage_permissions',
      'data.upload', 'data.read', 'data.update', 'data.delete', 'data.export',
      'analysis.basic', 'analysis.advanced', 'analysis.reports',
      'template.read', 'template.update', 'template.download',
      'system.configure', 'system.logs', 'system.backup'
    ],
    'admin': [
      'user.create', 'user.read', 'user.update', 'user.manage_roles',
      'role.read',
      'data.upload', 'data.read', 'data.update', 'data.delete', 'data.export',
      'analysis.basic', 'analysis.advanced', 'analysis.reports',
      'template.read', 'template.update', 'template.download'
    ],
    'manager': [
      'user.read',
      'data.upload', 'data.read', 'data.export',
      'analysis.basic', 'analysis.advanced', 'analysis.reports',
      'template.read', 'template.download'
    ],
    'analyst': [
      'data.read', 'data.export',
      'analysis.basic', 'analysis.advanced', 'analysis.reports',
      'template.read', 'template.download'
    ],
    'user': [
      'data.upload', 'data.read',
      'analysis.basic',
      'template.read', 'template.download'
    ],
    'viewer': [
      'data.read',
      'analysis.basic',
      'template.read'
    ]
  };

  for (const [roleName, permissions] of Object.entries(rolePermissions)) {
    const [roleRows] = await pool.query('SELECT id FROM roles WHERE name = ?', [roleName]);
    if (roleRows.length === 0) continue;
    
    const roleId = roleRows[0].id;

    for (const permissionName of permissions) {
      const [permRows] = await pool.query('SELECT id FROM permissions WHERE name = ?', [permissionName]);
      if (permRows.length === 0) continue;
      
      const permissionId = permRows[0].id;
      
      await pool.query(
        'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [roleId, permissionId]
      );
    }
  }
}

module.exports = { initializeRoleSystem };