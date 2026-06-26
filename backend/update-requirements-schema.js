const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gst_management',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function updateRequirementsSchema() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add HSN column to requirement_items
    await client.query(`
      ALTER TABLE requirement_items 
      ADD COLUMN IF NOT EXISTS hsn VARCHAR(50)
    `);

    // Add item_name column (rename from item_description)
    await client.query(`
      ALTER TABLE requirement_items 
      ADD COLUMN IF NOT EXISTS item_name VARCHAR(255)
    `);

    // Copy data from item_description to item_name if item_name is null
    await client.query(`
      UPDATE requirement_items 
      SET item_name = item_description 
      WHERE item_name IS NULL AND item_description IS NOT NULL
    `);

    // Drop estimated_cost column
    await client.query(`
      ALTER TABLE requirement_items 
      DROP COLUMN IF EXISTS estimated_cost
    `);

    // Make project_id nullable (it's already nullable, but ensure it)
    await client.query(`
      ALTER TABLE requirement_items 
      ALTER COLUMN unit DROP NOT NULL
    `);

    await client.query('COMMIT');
    console.log('✅ Requirements schema updated successfully!');
    console.log('   - Added HSN column');
    console.log('   - Added item_name column');
    console.log('   - Removed estimated_cost column');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating requirements schema:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateRequirementsSchema();









