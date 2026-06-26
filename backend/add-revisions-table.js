const pool = require('./config/database');

async function addRevisionsTable() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         Adding Revisions Tables                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Read and execute revisions schema
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, 'database', 'revisions-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await client.query(schema);
    console.log('✅ Revisions tables created successfully!\n');

    client.release();

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ Migration Complete!                           ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
    console.log('The revisions system allows NPD to create project revisions');
    console.log('with updated sketches and BOM items.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

addRevisionsTable();









