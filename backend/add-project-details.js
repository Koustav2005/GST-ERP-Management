const pool = require('./config/database');
const fs = require('fs');
const path = require('path');

async function addProjectDetails() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         Adding Project Details Features                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    const schemaPath = path.join(__dirname, 'database', 'project-details-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Adding project details features...');
    await client.query(schema);
    console.log('✅ Project details features added!\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Features Added:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('  ✅ Sketch upload support (sketch_url column)');
    console.log('  ✅ Bill of Materials table');
    console.log('  ✅ Project status history tracking');
    console.log('  ✅ Project notes field');

    client.release();

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ Setup Complete!                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

addProjectDetails();
