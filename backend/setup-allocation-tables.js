const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gst_management',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function setupAllocationTables() {
  try {
    console.log('📋 Setting up allocation_tasks tables...');

    // Read schema file
    const schemaPath = path.join(__dirname, 'database', 'allocation-tasks-schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Schema file not found:', schemaPath);
      process.exit(1);
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    await pool.query(schema);

    console.log('✅ Allocation tables created successfully!');
    console.log('   - allocation_tasks');
    console.log('   - allocation_inventory_mapping');

    process.exit(0);
  } catch (error) {
    if (error.code === '42P07') {
      console.log('⚠️  Tables already exist. Skipping...');
      process.exit(0);
    } else {
      console.error('❌ Error setting up tables:', error.message);
      console.error('   Details:', error);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

setupAllocationTables();






