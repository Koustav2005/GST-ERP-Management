const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gst_management',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function addHSNToBOM() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add HSN column to bill_of_materials table
    await client.query(`
      ALTER TABLE bill_of_materials 
      ADD COLUMN IF NOT EXISTS hsn VARCHAR(50)
    `);

    // Add HSN column to revision_bom_items table
    await client.query(`
      ALTER TABLE revision_bom_items 
      ADD COLUMN IF NOT EXISTS hsn VARCHAR(50)
    `);

    await client.query('COMMIT');
    console.log('✅ HSN column added to BOM tables successfully!');
    console.log('   - Added HSN to bill_of_materials');
    console.log('   - Added HSN to revision_bom_items');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding HSN to BOM:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addHSNToBOM();








