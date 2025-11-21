const pool = require('./config/database');

async function checkCompanies() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         Checking Companies & Users                            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    const client = await pool.connect();

    // Get all companies
    const companies = await client.query('SELECT * FROM companies ORDER BY id');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Companies: ${companies.rows.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (companies.rows.length > 0) {
      companies.rows.forEach((company, index) => {
        console.log(`${index + 1}. ${company.name}`);
        console.log(`   ID: ${company.id}`);
        console.log(`   Email: ${company.email}`);
        console.log(`   GST: ${company.gst_number || 'Not set'}`);
        console.log('');
      });
    } else {
      console.log('No companies yet. Create one by signing up as Management!\n');
    }

    // Get all users with company info
    const users = await client.query(`
      SELECT u.id, u.name, u.email, u.role, u.company_id, c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      ORDER BY u.id
    `);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Users: ${users.rows.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (users.rows.length > 0) {
      users.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Company: ${user.company_name || 'Not assigned'}`);
        console.log('');
      });
    } else {
      console.log('No users yet. Sign up to create users!\n');
    }

    // Show company hierarchy
    if (companies.rows.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Company Hierarchy:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      for (const company of companies.rows) {
        console.log(`🏢 ${company.name}`);
        
        const companyUsers = await client.query(
          'SELECT name, role FROM users WHERE company_id = $1 ORDER BY role',
          [company.id]
        );

        if (companyUsers.rows.length > 0) {
          companyUsers.rows.forEach(user => {
            console.log(`   ├── ${user.name} (${user.role})`);
          });
        } else {
          console.log('   └── No employees yet');
        }
        console.log('');
      }
    }

    client.release();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

checkCompanies();
