const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gst_management',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function addDemandItemIdToMaterialsDetail() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add column if it doesn't exist
    await client.query(`
      ALTER TABLE materials_detail
      ADD COLUMN IF NOT EXISTS demand_item_id INTEGER REFERENCES demand_items(id) ON DELETE SET NULL
    `);

    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_materials_detail_demand_item_id
      ON materials_detail(demand_item_id)
    `);

    // Ensure there is only one awarded record per demand item
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_materials_detail_unique_demand_item
      ON materials_detail(demand_item_id)
      WHERE demand_item_id IS NOT NULL
    `);

    await client.query('COMMIT');
    console.log('✅ Added demand_item_id column to materials_detail table');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding demand_item_id column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addDemandItemIdToMaterialsDetail();









