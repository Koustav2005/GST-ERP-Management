const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gst_management',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function addGSTINToUsers() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add gstin column to users table
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS gstin VARCHAR(15)
    `);

    await client.query('COMMIT');
    console.log('✅ GSTIN column added to users table successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding GSTIN column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addGSTINToUsers();








