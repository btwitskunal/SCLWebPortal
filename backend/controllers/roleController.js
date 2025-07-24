const pool = require('../utils/db');

class RoleController {
  // Get all roles with their permissions
  static async getAllRoles(req, res) {
    try {
      const [roles] = await pool.query(`
        SELECT 
          r.id,
          r.name,
          r.description,
          r.is_active,
          r.created_at,
          r.updated_at,
          COUNT(u.id) as user_count
        FROM roles r
        LEFT JOIN users u ON r.id = u.role_id AND u.is_active = TRUE
        GROUP BY r.id
        ORDER BY r.name
      `);

      // Get permissions for each role
      for (const role of roles) {
        const [permissions] = await pool.query(`
          SELECT p.id, p.name, p.description, p.resource, p.action
          FROM permissions p
          JOIN role_permissions rp ON p.id = rp.permission_id
          WHERE rp.role_id = ?
          ORDER BY p.resource, p.action
        `, [role.id]);
        
        role.permissions = permissions;
      }

      res.json({ roles });
    } catch (error) {
      console.error('Error in getAllRoles:', error);
      res.status(500).json({ error: 'Failed to fetch roles' });
    }
  }

  // Get single role by ID
  static async getRoleById(req, res) {
    try {
      const { id } = req.params;
      
      const [roles] = await pool.query(`
        SELECT 
          r.*,
          COUNT(u.id) as user_count
        FROM roles r
        LEFT JOIN users u ON r.id = u.role_id AND u.is_active = TRUE
        WHERE r.id = ?
        GROUP BY r.id
      `, [id]);

      if (roles.length === 0) {
        return res.status(404).json({ error: 'Role not found' });
      }

      const role = roles[0];

      // Get permissions for this role
      const [permissions] = await pool.query(`
        SELECT p.id, p.name, p.description, p.resource, p.action
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ?
        ORDER BY p.resource, p.action
      `, [id]);
      
      role.permissions = permissions;

      res.json({ role });
    } catch (error) {
      console.error('Error in getRoleById:', error);
      res.status(500).json({ error: 'Failed to fetch role' });
    }
  }

  // Create new role
  static async createRole(req, res) {
    try {
      const { name, description, permissions = [] } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Role name is required' });
      }

      // Check if role name already exists
      const [existingRoles] = await pool.query(
        'SELECT id FROM roles WHERE name = ?', 
        [name]
      );

      if (existingRoles.length > 0) {
        return res.status(400).json({ error: 'Role name already exists' });
      }

      // Create role
      const [result] = await pool.query(
        'INSERT INTO roles (name, description) VALUES (?, ?)',
        [name, description || null]
      );

      const roleId = result.insertId;

      // Assign permissions if provided
      if (permissions.length > 0) {
        await this.assignPermissionsToRole(roleId, permissions);
      }

      // Fetch and return the created role
      const createdRole = await this.getRoleWithPermissions(roleId);
      res.status(201).json({ 
        message: 'Role created successfully', 
        role: createdRole 
      });
    } catch (error) {
      console.error('Error in createRole:', error);
      res.status(500).json({ error: 'Failed to create role' });
    }
  }

  // Update role
  static async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { name, description, is_active, permissions } = req.body;

      // Check if role exists
      const [existingRoles] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
      if (existingRoles.length === 0) {
        return res.status(404).json({ error: 'Role not found' });
      }

      // Check if new name conflicts with existing roles (except current)
      if (name) {
        const [nameConflict] = await pool.query(
          'SELECT id FROM roles WHERE name = ? AND id != ?', 
          [name, id]
        );
        if (nameConflict.length > 0) {
          return res.status(400).json({ error: 'Role name already exists' });
        }
      }

      // Update role basic info
      const updateFields = [];
      const updateValues = [];
      
      if (name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(name);
      }
      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description);
      }
      if (is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(is_active);
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(id);
        
        await pool.query(
          `UPDATE roles SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
      }

      // Update permissions if provided
      if (permissions !== undefined) {
        // Remove all existing permissions
        await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);
        
        // Add new permissions
        if (permissions.length > 0) {
          await this.assignPermissionsToRole(id, permissions);
        }
      }

      // Fetch and return updated role
      const updatedRole = await this.getRoleWithPermissions(id);
      res.json({ 
        message: 'Role updated successfully', 
        role: updatedRole 
      });
    } catch (error) {
      console.error('Error in updateRole:', error);
      res.status(500).json({ error: 'Failed to update role' });
    }
  }

  // Delete role
  static async deleteRole(req, res) {
    try {
      const { id } = req.params;

      // Check if role exists
      const [existingRoles] = await pool.query('SELECT * FROM roles WHERE id = ?', [id]);
      if (existingRoles.length === 0) {
        return res.status(404).json({ error: 'Role not found' });
      }

      // Check if role is assigned to any users
      const [assignedUsers] = await pool.query(
        'SELECT COUNT(*) as count FROM users WHERE role_id = ? AND is_active = TRUE', 
        [id]
      );
      
      if (assignedUsers[0].count > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete role that is assigned to active users',
          assigned_users: assignedUsers[0].count
        });
      }

      // Delete role (permissions will be deleted by CASCADE)
      await pool.query('DELETE FROM roles WHERE id = ?', [id]);

      res.json({ message: 'Role deleted successfully' });
    } catch (error) {
      console.error('Error in deleteRole:', error);
      res.status(500).json({ error: 'Failed to delete role' });
    }
  }

  // Get all permissions
  static async getAllPermissions(req, res) {
    try {
      const [permissions] = await pool.query(`
        SELECT * FROM permissions 
        ORDER BY resource, action
      `);

      // Group permissions by resource
      const groupedPermissions = permissions.reduce((acc, permission) => {
        if (!acc[permission.resource]) {
          acc[permission.resource] = [];
        }
        acc[permission.resource].push(permission);
        return acc;
      }, {});

      res.json({ 
        permissions,
        grouped_permissions: groupedPermissions 
      });
    } catch (error) {
      console.error('Error in getAllPermissions:', error);
      res.status(500).json({ error: 'Failed to fetch permissions' });
    }
  }

  // Helper method to get role with permissions
  static async getRoleWithPermissions(roleId) {
    const [roles] = await pool.query(`
      SELECT 
        r.*,
        COUNT(u.id) as user_count
      FROM roles r
      LEFT JOIN users u ON r.id = u.role_id AND u.is_active = TRUE
      WHERE r.id = ?
      GROUP BY r.id
    `, [roleId]);

    if (roles.length === 0) return null;

    const role = roles[0];

    const [permissions] = await pool.query(`
      SELECT p.id, p.name, p.description, p.resource, p.action
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ?
      ORDER BY p.resource, p.action
    `, [roleId]);
    
    role.permissions = permissions;
    return role;
  }

  // Helper method to assign permissions to role
  static async assignPermissionsToRole(roleId, permissionIds) {
    if (!Array.isArray(permissionIds) || permissionIds.length === 0) {
      return;
    }

    // Validate that all permission IDs exist
    const [validPermissions] = await pool.query(
      `SELECT id FROM permissions WHERE id IN (${permissionIds.map(() => '?').join(',')})`,
      permissionIds
    );

    if (validPermissions.length !== permissionIds.length) {
      throw new Error('One or more invalid permission IDs provided');
    }

    // Insert role-permission associations
    const values = permissionIds.map(permId => [roleId, permId]);
    await pool.query(
      'INSERT INTO role_permissions (role_id, permission_id) VALUES ?',
      [values]
    );
  }
}

module.exports = RoleController;