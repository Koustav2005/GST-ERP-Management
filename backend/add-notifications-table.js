const pool = require('./config/database');

async function addNotificationsTable() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         Adding Notifications Table                            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Read and execute notifications schema
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, 'database', 'notifications-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await client.query(schema);
    console.log('✅ Notifications table created successfully!\n');

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

addNotificationsTable();









