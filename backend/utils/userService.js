const pool = require('./db');

class UserService {
  // Find or create user from Azure AD profile
  static async findOrCreateUser(azureProfile) {
    try {
      const azureOid = azureProfile.oid;
      const email = azureProfile._json?.email || azureProfile.email || azureProfile._json?.preferred_username;
      const displayName = azureProfile.displayName || azureProfile._json?.name || email;

      // Check if user exists
      const [existingUsers] = await pool.query(
        'SELECT * FROM users WHERE azure_oid = ? OR email = ?',
        [azureOid, email]
      );

      if (existingUsers.length > 0) {
        const user = existingUsers[0];
        // Update display name if changed
        if (user.display_name !== displayName) {
          await pool.query(
            'UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [displayName, user.id]
          );
          user.display_name = displayName;
        }
        return user;
      }

      // Create new user with default role
      const defaultRole = await this.getDefaultRole();
      const [result] = await pool.query(
        'INSERT INTO users (azure_oid, email, display_name, role_id) VALUES (?, ?, ?, ?)',
        [azureOid, email, displayName, defaultRole.id]
      );

      // Fetch and return the created user
      const [newUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      return newUsers[0];
    } catch (error) {
      console.error('Error in findOrCreateUser:', error);
      throw error;
    }
  }

  // Get user with role and permissions
  static async getUserWithPermissions(userId) {
    try {
      const [users] = await pool.query(`
        SELECT 
          u.*,
          r.name as role_name,
          r.description as role_description
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ? AND u.is_active = TRUE
      `, [userId]);

      if (users.length === 0) return null;

      const user = users[0];

      // Get user permissions
      const [permissions] = await pool.query(`
        SELECT p.name, p.description, p.resource, p.action
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN roles r ON rp.role_id = r.id
        WHERE r.id = ? AND r.is_active = TRUE
      `, [user.role_id]);

      user.permissions = permissions;
      return user;
    } catch (error) {
      console.error('Error in getUserWithPermissions:', error);
      throw error;
    }
  }

  // Check if user has specific permission
  static async hasPermission(userId, permissionName) {
    try {
      const [result] = await pool.query(`
        SELECT COUNT(*) as count
        FROM users u
        JOIN roles r ON u.role_id = r.id
        JOIN role_permissions rp ON r.id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE u.id = ? AND p.name = ? AND u.is_active = TRUE AND r.is_active = TRUE
      `, [userId, permissionName]);

      return result[0].count > 0;
    } catch (error) {
      console.error('Error in hasPermission:', error);
      return false;
    }
  }

  // Check if user has permission for resource and action
  static async hasResourcePermission(userId, resource, action) {
    try {
      const [result] = await pool.query(`
        SELECT COUNT(*) as count
        FROM users u
        JOIN roles r ON u.role_id = r.id
        JOIN role_permissions rp ON r.id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE u.id = ? AND p.resource = ? AND p.action = ? 
        AND u.is_active = TRUE AND r.is_active = TRUE
      `, [userId, resource, action]);

      return result[0].count > 0;
    } catch (error) {
      console.error('Error in hasResourcePermission:', error);
      return false;
    }
  }

  // Get all users with their roles
  static async getAllUsers(page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      
      const [users] = await pool.query(`
        SELECT 
          u.id,
          u.azure_oid,
          u.email,
          u.display_name,
          u.is_active,
          u.created_at,
          u.updated_at,
          r.name as role_name,
          r.description as role_description
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);

      const [totalResult] = await pool.query('SELECT COUNT(*) as total FROM users');
      const total = totalResult[0].total;

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      throw error;
    }
  }

  // Update user role
  static async updateUserRole(userId, roleId) {
    try {
      await pool.query(
        'UPDATE users SET role_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [roleId, userId]
      );
      return await this.getUserWithPermissions(userId);
    } catch (error) {
      console.error('Error in updateUserRole:', error);
      throw error;
    }
  }

  // Activate/Deactivate user
  static async updateUserStatus(userId, isActive) {
    try {
      await pool.query(
        'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [isActive, userId]
      );
      return await this.getUserWithPermissions(userId);
    } catch (error) {
      console.error('Error in updateUserStatus:', error);
      throw error;
    }
  }

  // Get default role (sales_executive as default)
  static async getDefaultRole() {
    try {
      const [roles] = await pool.query(
        'SELECT * FROM roles WHERE name = ? AND is_active = TRUE',
        ['sales_executive']
      );
      
      if (roles.length > 0) {
        return roles[0];
      }

      // Fallback to first available role
      const [fallbackRoles] = await pool.query(
        'SELECT * FROM roles WHERE is_active = TRUE ORDER BY id ASC LIMIT 1'
      );
      
      return fallbackRoles[0] || null;
    } catch (error) {
      console.error('Error in getDefaultRole:', error);
      throw error;
    }
  }

  // Get user by Azure OID
  static async getUserByAzureOid(azureOid) {
    try {
      const [users] = await pool.query(
        'SELECT * FROM users WHERE azure_oid = ? AND is_active = TRUE',
        [azureOid]
      );
      return users[0] || null;
    } catch (error) {
      console.error('Error in getUserByAzureOid:', error);
      throw error;
    }
  }

  // Get user permissions as a simple array
  static async getUserPermissions(userId) {
    try {
      const [permissions] = await pool.query(`
        SELECT p.name
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN roles r ON rp.role_id = r.id
        JOIN users u ON u.role_id = r.id
        WHERE u.id = ? AND u.is_active = TRUE AND r.is_active = TRUE
      `, [userId]);

      return permissions.map(p => p.name);
    } catch (error) {
      console.error('Error in getUserPermissions:', error);
      return [];
    }
  }
}

module.exports = UserService;