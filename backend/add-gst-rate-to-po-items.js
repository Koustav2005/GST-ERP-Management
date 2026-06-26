const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'gst_management',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function addGstRateToPOItems() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Add gst_rate column to purchase_order_items
        await client.query(`
      ALTER TABLE purchase_order_items 
      ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(10, 2) DEFAULT 0
    `);

        await client.query('COMMIT');
        console.log('✅ Column gst_rate added to purchase_order_items successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error adding gst_rate column:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

addGstRateToPOItems();
