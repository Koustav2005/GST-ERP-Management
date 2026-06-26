const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gst_management',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function addQrNumberToBarcodes() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add qr_number column if it doesn't exist
    await client.query(`
      ALTER TABLE barcodes 
      ADD COLUMN IF NOT EXISTS qr_number VARCHAR(50) UNIQUE
    `);

    // Generate QR numbers for existing records that don't have one
    const existingBarcodes = await client.query(`
      SELECT id FROM barcodes WHERE qr_number IS NULL
    `);

    for (const barcode of existingBarcodes.rows) {
      const qrNumber = `QR${String(barcode.id).padStart(8, '0')}`;
      await client.query(`
        UPDATE barcodes SET qr_number = $1 WHERE id = $2
      `, [qrNumber, barcode.id]);
    }

    // Create index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_barcodes_qr_number ON barcodes(qr_number)
    `);

    await client.query('COMMIT');
    console.log('✅ QR number column added successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding QR number column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addQrNumberToBarcodes();







