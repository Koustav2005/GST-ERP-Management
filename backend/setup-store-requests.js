const pool = require('./config/database');
const fs = require('fs');
const path = require('path');

async function setupStoreRequests() {
  try {
    console.log('📦 Setting up store requests tables...\n');

    // Check if tables already exist
    const checkResult = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('store_requests', 'store_request_items')
    `);

    if (checkResult.rows.length === 2) {
      console.log('✅ Tables already exist!');
      console.log('   - store_requests ✓');
      console.log('   - store_request_items ✓\n');
      return;
    }

    // Read the schema file
    const schemaPath = path.join(__dirname, 'database', 'store-requests-schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Schema file not found:', schemaPath);
      process.exit(1);
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute the schema
    await pool.query(schema);

    console.log('✅ Store requests tables created successfully!');
    console.log('   - store_requests table');
    console.log('   - store_request_items table');
    console.log('   - Indexes created\n');
  } catch (error) {
    console.error('❌ Error setting up store requests:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupStoreRequests();

