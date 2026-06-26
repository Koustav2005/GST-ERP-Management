const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('Starting migration: adding weight columns to order_receipts...');
        await client.query('BEGIN');

        // Add gross_weight
        await client.query(`
      ALTER TABLE order_receipts 
      ADD COLUMN IF NOT EXISTS gross_weight NUMERIC(10, 2)
    `);

        // Add tare_weight
        await client.query(`
      ALTER TABLE order_receipts 
      ADD COLUMN IF NOT EXISTS tare_weight NUMERIC(10, 2)
    `);

        // Add net_weight
        await client.query(`
      ALTER TABLE order_receipts 
      ADD COLUMN IF NOT EXISTS net_weight NUMERIC(10, 2)
    `);

        await client.query('COMMIT');
        console.log('Migration successful: gross_weight, tare_weight, and net_weight added.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
    } finally {
        client.release();
        pool.end();
    }
}

runMigration();
