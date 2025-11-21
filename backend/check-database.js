const pool = require('./config/database');

async function checkDatabase() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         Checking Database - Users Table                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Check connection
    const client = await pool.connect();
    console.log('✅ Database connected successfully!\n');

    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✅ Users table exists\n');

      // Get all users
      const users = await client.query('SELECT id, name, email, role, created_at FROM users ORDER BY id');
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Total users in database: ${users.rows.length}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      if (users.rows.length > 0) {
        console.log('Users stored in database:\n');
        users.rows.forEach((user, index) => {
          console.log(`${index + 1}. ${user.name}`);
          console.log(`   Email: ${user.email}`);
          console.log(`   Role: ${user.role}`);
          console.log(`   Created: ${user.created_at}`);
          console.log('');
        });
      } else {
        console.log('No users yet. Sign up from the app to create users!\n');
      }

      // Show table structure
      const structure = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
        ORDER BY ordinal_position;
      `);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Table Structure:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      structure.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type}`);
      });

    } else {
      console.log('❌ Users table does not exist!');
      console.log('Run: npm run setup');
    }

    client.release();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  process.exit(0);
}

checkDatabase();
