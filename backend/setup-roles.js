require('dotenv').config();
const { initializeRoleSystem } = require('./utils/initializeRoleSystem');
const pool = require('./utils/db');

async function setupRoleSystem() {
  try {
    console.log('🚀 Setting up role system...');
    
    // Initialize role system
    await initializeRoleSystem();
    console.log('✅ Role system initialized');

    // Optional: Create a super admin user manually
    // You would typically do this after the first login via Azure AD
    const email = process.env.SUPER_ADMIN_EMAIL;
    if (email) {
      console.log(`📝 Looking for super admin user: ${email}`);
      
      const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      
      if (existingUsers.length > 0) {
        // Update existing user to super admin
        const [superAdminRole] = await pool.query('SELECT id FROM roles WHERE name = ?', ['super_admin']);
        
        if (superAdminRole.length > 0) {
          await pool.query(
            'UPDATE users SET role_id = ? WHERE email = ?',
            [superAdminRole[0].id, email]
          );
          console.log(`✅ Updated ${email} to super admin role`);
        }
      } else {
        console.log(`⚠️  User ${email} not found. They need to login first via Azure AD.`);
        console.log(`💡 After first login, run: UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'super_admin') WHERE email = '${email}';`);
      }
    }

    console.log('\n🎉 Role system setup complete!');
    console.log('\n📋 Default Roles Created:');
    console.log('   • super_admin - Full system access');
    console.log('   • admin - Management capabilities');  
    console.log('   • manager - Data analysis and oversight');
    console.log('   • analyst - Data analysis permissions');
    console.log('   • user - Basic upload and view permissions');
    console.log('   • viewer - Read-only access');

    console.log('\n🔐 Default Permissions Created:');
    console.log('   • User Management (user.*)');
    console.log('   • Role Management (role.*)');
    console.log('   • Data Management (data.*)');
    console.log('   • Analysis (analysis.*)');
    console.log('   • Template Management (template.*)');
    console.log('   • System Administration (system.*)');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up role system:', error);
    process.exit(1);
  }
}

// Run setup
setupRoleSystem();