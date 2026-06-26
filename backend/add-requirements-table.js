const pool = require('./config/database');

async function addRequirementsTable() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         Adding Requirements Tables                            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Read and execute requirements schema
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, 'database', 'requirements-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await client.query(schema);
    console.log('✅ Requirements tables created successfully!\n');

    client.release();

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ Migration Complete!                           ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

addRequirementsTable();









