const UserService = require('../utils/userService');
const pool = require('../utils/db');

class UserController {
  // Get all users with pagination
  static async getAllUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const search = req.query.search || '';
      const roleFilter = req.query.role || '';
      const statusFilter = req.query.status || '';

      let whereConditions = [];
      let queryParams = [];

      // Add search condition
      if (search) {
        whereConditions.push('(u.display_name LIKE ? OR u.email LIKE ?)');
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      // Add role filter
      if (roleFilter) {
        whereConditions.push('r.name = ?');
        queryParams.push(roleFilter);
      }

      // Add status filter
      if (statusFilter) {
        whereConditions.push('u.is_active = ?');
        queryParams.push(statusFilter === 'active' ? 1 : 0);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      const offset = (page - 1) * limit;

      // Get users with pagination
      const [users] = await pool.query(`
        SELECT 
          u.id,
          u.azure_oid,
          u.email,
          u.display_name,
          u.is_active,
          u.created_at,
          u.updated_at,
          r.id as role_id,
          r.name as role_name,
          r.description as role_description
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
      `, [...queryParams, limit, offset]);

      // Get total count for pagination
      const [countResult] = await pool.query(`
        SELECT COUNT(*) as total 
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        ${whereClause}
      `, queryParams);

      const total = countResult[0].total;

      res.json({
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  // Get current user profile with permissions
  static async getCurrentUser(req, res) {
    try {
      const user = await UserService.getUserWithPermissions(req.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  }

  // Get user by ID
  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserWithPermissions(id);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Error in getUserById:', error);
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  // Update user role
  static async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role_id } = req.body;

      if (!role_id) {
        return res.status(400).json({ error: 'Role ID is required' });
      }

      // Check if role exists
      const [roles] = await pool.query('SELECT * FROM roles WHERE id = ? AND is_active = TRUE', [role_id]);
      if (roles.length === 0) {
        return res.status(400).json({ error: 'Invalid role ID' });
      }

      // Check if user exists
      const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update user role
      const updatedUser = await UserService.updateUserRole(id, role_id);
      
      res.json({
        message: 'User role updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Error in updateUserRole:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }

  // Update user status (activate/deactivate)
  static async updateUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'is_active must be a boolean value' });
      }

      // Check if user exists
      const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Prevent deactivating self
      if (parseInt(id) === req.userId && !is_active) {
        return res.status(400).json({ error: 'Cannot deactivate your own account' });
      }

      // Update user status
      const updatedUser = await UserService.updateUserStatus(id, is_active);
      
      res.json({
        message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
        user: updatedUser
      });
    } catch (error) {
      console.error('Error in updateUserStatus:', error);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  }

  // Get user statistics
  static async getUserStats(req, res) {
    try {
      // Total users
      const [totalUsers] = await pool.query('SELECT COUNT(*) as count FROM users');
      
      // Active users
      const [activeUsers] = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = TRUE');
      
      // Users by role
      const [usersByRole] = await pool.query(`
        SELECT 
          r.name as role_name,
          r.description,
          COUNT(u.id) as user_count
        FROM roles r
        LEFT JOIN users u ON r.id = u.role_id AND u.is_active = TRUE
        WHERE r.is_active = TRUE
        GROUP BY r.id, r.name, r.description
        ORDER BY user_count DESC
      `);

      // Recent registrations (last 30 days)
      const [recentRegistrations] = await pool.query(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `);

      res.json({
        stats: {
          total_users: totalUsers[0].count,
          active_users: activeUsers[0].count,
          inactive_users: totalUsers[0].count - activeUsers[0].count,
          recent_registrations: recentRegistrations[0].count,
          users_by_role: usersByRole
        }
      });
    } catch (error) {
      console.error('Error in getUserStats:', error);
      res.status(500).json({ error: 'Failed to fetch user statistics' });
    }
  }

  // Get available roles for assignment
  static async getAvailableRoles(req, res) {
    try {
      const [roles] = await pool.query(`
        SELECT id, name, description 
        FROM roles 
        WHERE is_active = TRUE 
        ORDER BY name
      `);

      res.json({ roles });
    } catch (error) {
      console.error('Error in getAvailableRoles:', error);
      res.status(500).json({ error: 'Failed to fetch available roles' });
    }
  }

  // Bulk update user roles
  static async bulkUpdateUserRoles(req, res) {
    try {
      const { updates } = req.body; // Array of {user_id, role_id}

      if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: 'Updates array is required' });
      }

      const results = [];
      const errors = [];

      for (const update of updates) {
        try {
          const { user_id, role_id } = update;
          
          // Validate inputs
          if (!user_id || !role_id) {
            errors.push({ user_id, error: 'Both user_id and role_id are required' });
            continue;
          }

          // Update user role
          const updatedUser = await UserService.updateUserRole(user_id, role_id);
          if (updatedUser) {
            results.push({ user_id, success: true, user: updatedUser });
          } else {
            errors.push({ user_id, error: 'User not found' });
          }
        } catch (err) {
          errors.push({ user_id: update.user_id, error: err.message });
        }
      }

      res.json({
        message: 'Bulk update completed',
        successful_updates: results.length,
        failed_updates: errors.length,
        results,
        errors
      });
    } catch (error) {
      console.error('Error in bulkUpdateUserRoles:', error);
      res.status(500).json({ error: 'Failed to perform bulk update' });
    }
  }
}

module.exports = UserController;