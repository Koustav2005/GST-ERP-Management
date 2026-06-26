const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gst_management',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function updateBarcodesUniqueConstraint() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop the existing unique constraint on order_id
    await client.query(`
      ALTER TABLE barcodes 
      DROP CONSTRAINT IF EXISTS barcodes_order_id_key
    `);

    // Add unique constraint on (order_id, exp_date) to allow multiple QR codes per order with different expiry dates
    await client.query(`
      ALTER TABLE barcodes 
      ADD CONSTRAINT barcodes_order_exp_unique UNIQUE(order_id, exp_date)
    `);

    await client.query('COMMIT');
    console.log('✅ Barcodes unique constraint updated successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error updating barcodes constraint:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateBarcodesUniqueConstraint();







