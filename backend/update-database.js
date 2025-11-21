const pool = require('./config/database');
const fs = require('fs');
const path = require('path');

async function updateDatabase() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         Updating Database Schema                             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Read and execute update schema
    const schemaPath = path.join(__dirname, 'database', 'update-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Running schema updates...');
    await client.query(schema);
    console.log('✅ Schema updated successfully!\n');

    // Check if companies table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'companies'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✅ Companies table created\n');

      // Check if column was added
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'company_id';
      `);

      if (columnCheck.rows.length > 0) {
        console.log('✅ company_id column added to users table\n');
      }

      // Show table structure
      const companiesStructure = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'companies'
        ORDER BY ordinal_position;
      `);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Companies Table Structure:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      companiesStructure.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type}`);
      });

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Updated Users Table Structure:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      const usersStructure = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
        ORDER BY ordinal_position;
      `);
      
      usersStructure.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type}`);
      });
    }

    client.release();

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ Database Update Complete!                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    console.log('Next: Restart backend server');
    console.log('  npm run dev\n');

  } catch (error) {
    console.error('❌ Error updating database:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }

  process.exit(0);
}

updateDatabase();
