const pool = require('./config/database');
const fs = require('fs');
const path = require('path');

async function addProjectsTable() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         Adding Projects Table                                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'database', 'projects-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Creating projects table...');
    await client.query(schema);
    console.log('✅ Projects table created successfully!\n');

    // Show table structure
    const structure = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'projects'
      ORDER BY ordinal_position;
    `);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Projects Table Structure:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    structure.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });

    client.release();

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ Projects Table Added!                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

addProjectsTable();
