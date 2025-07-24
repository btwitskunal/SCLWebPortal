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
    { name: 'do', description: 'District Officer - Can upload, download and analyze data with filters' },
    { name: 'admin', description: 'Admin/Sales Executive - Can download and analyze data only' }
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
    // Data Management
    { name: 'data.upload', description: 'Upload data files', resource: 'data', action: 'upload' },
    { name: 'data.read', description: 'View uploaded data', resource: 'data', action: 'read' },
    { name: 'data.download', description: 'Download data files', resource: 'data', action: 'download' },
    { name: 'data.filter', description: 'Apply filters to data', resource: 'data', action: 'filter' },

    // Analysis
    { name: 'analysis.basic', description: 'Perform basic data analysis', resource: 'analysis', action: 'basic' },
    { name: 'analysis.advanced', description: 'Perform advanced analytics', resource: 'analysis', action: 'advanced' },
    { name: 'analysis.reports', description: 'Generate reports', resource: 'analysis', action: 'reports' },

    // Template Management
    { name: 'template.read', description: 'View templates', resource: 'template', action: 'read' },
    { name: 'template.download', description: 'Download templates', resource: 'template', action: 'download' }
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
    'do': [
      // DO can upload, download, view data with filters and perform analysis
      'data.upload',
      'data.read', 
      'data.download',
      'data.filter',
      'analysis.basic',
      'analysis.advanced', 
      'analysis.reports',
      'template.read',
      'template.download'
    ],
    'admin': [
      // Admin/Sales Executive can only download, view data and perform analysis (no upload)
      'data.read',
      'data.download',
      'data.filter',
      'analysis.basic',
      'analysis.advanced',
      'analysis.reports', 
      'template.read',
      'template.download'
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