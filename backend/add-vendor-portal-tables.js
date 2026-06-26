const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gst_management',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function addVendorPortalTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Read and execute the vendor portal schema
    const schemaPath = path.join(__dirname, 'database', 'vendor-portal-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await client.query(schema);

    // Update users table to include 'vendor' role
    await client.query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS users_role_check
    `);
    
    await client.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN ('management', 'project_manager', 'accounts', 'store_incharge', 'worker', 'sales_executive', 'npd', 'vendor'))
    `);

    // Check if companies table exists, if not create it
    const companiesCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'companies'
      )
    `);

    if (!companiesCheck.rows[0].exists) {
      // Create companies table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS companies (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Add company_id to users table if it doesn't exist
      const companyIdCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'company_id'
      `);
      
      if (companyIdCheck.rows.length === 0) {
        await client.query(`
          ALTER TABLE users 
          ADD COLUMN company_id INTEGER REFERENCES companies(id)
        `);
      }
    }

    await client.query('COMMIT');
    console.log('✅ Vendor portal tables created successfully!');
    console.log('   - Created vendor_demands table');
    console.log('   - Created demand_items table');
    console.log('   - Created vendor_bids table');
    console.log('   - Created bid_items table');
    console.log('   - Updated users table to include vendor role');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating vendor portal tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addVendorPortalTables();








