require('dotenv').config();
const { initializeRoleSystem } = require('./utils/initializeRoleSystem');
const pool = require('./utils/db');

async function setupRoleSystem() {
  try {
    console.log('🚀 Setting up role system...');
    
    // Initialize role system
    await initializeRoleSystem();
    console.log('✅ Role system initialized');

    // Optional: Create a DO user manually
    // You would typically do this after the first login via Azure AD
    const doEmail = process.env.DO_EMAIL;
    if (doEmail) {
      console.log(`📝 Looking for DO user: ${doEmail}`);
      
      const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [doEmail]);
      
      if (existingUsers.length > 0) {
        // Update existing user to DO role
        const [doRole] = await pool.query('SELECT id FROM roles WHERE name = ?', ['do']);
        
        if (doRole.length > 0) {
          await pool.query(
            'UPDATE users SET role_id = ? WHERE email = ?',
            [doRole[0].id, doEmail]
          );
          console.log(`✅ Updated ${doEmail} to DO role`);
        }
      } else {
        console.log(`⚠️  User ${doEmail} not found. They need to login first via Azure AD.`);
        console.log(`💡 After first login, run: UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'do') WHERE email = '${doEmail}';`);
      }
    }

    console.log('\n🎉 Role system setup complete!');
    console.log('\n📋 Roles Created:');
    console.log('   • DO (District Officer) - Upload, download, filter and analyze data');
    console.log('   • Admin/Sales Executive - Download, filter and analyze data only');

    console.log('\n🔐 Permissions Created:');
    console.log('   • Data Management (data.upload, data.read, data.download, data.filter)');
    console.log('   • Analysis (analysis.basic, analysis.advanced, analysis.reports)');
    console.log('   • Template Management (template.read, template.download)');

    console.log('\n📊 Role Capabilities:');
    console.log('   DO:');
    console.log('     ✅ Upload files');
    console.log('     ✅ Download filtered data');
    console.log('     ✅ View and analyze all data');
    console.log('     ✅ Generate reports');
    console.log('   ');
    console.log('   Admin/Sales Executive:');
    console.log('     ❌ Upload files');
    console.log('     ✅ Download filtered data');
    console.log('     ✅ View and analyze all data');
    console.log('     ✅ Generate reports');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up role system:', error);
    process.exit(1);
  }
}

// Run setup
setupRoleSystem();