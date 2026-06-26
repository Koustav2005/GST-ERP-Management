const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gst_management',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function updateVendorBidsDate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add supply_until_date column
    await client.query(`
      ALTER TABLE vendor_bids 
      ADD COLUMN IF NOT EXISTS supply_until_date DATE
    `);

    // Migrate existing data: convert supply_period_days to supply_until_date
    // For existing bids, calculate date from created_at + supply_period_days
    await client.query(`
      UPDATE vendor_bids 
      SET supply_until_date = (created_at + (supply_period_days::text || ' days')::INTERVAL)::DATE
      WHERE supply_until_date IS NULL AND supply_period_days IS NOT NULL
    `);

    // For new table, make supply_until_date NOT NULL (skip if there are null values)
    // We'll make it required in application logic instead

    // Drop supply_period_days column (optional - we can keep it for now or drop it)
    // await client.query(`ALTER TABLE vendor_bids DROP COLUMN IF EXISTS supply_period_days`);

    await client.query('COMMIT');
    console.log('✅ Vendor bids updated successfully!');
    console.log('   - Added supply_until_date column');
    console.log('   - Migrated existing data');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating vendor bids:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateVendorBidsDate();

