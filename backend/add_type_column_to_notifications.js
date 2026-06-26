const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'gst_svcee',
    password: process.env.DB_PASSWORD || 'admin123',
    port: process.env.DB_PORT || 5432,
});

async function addTypeColumn() {
    try {
        console.log('--- Adding type column to notifications table ---');

        await pool.query(`
            ALTER TABLE notifications 
            ADD COLUMN IF NOT EXISTS type VARCHAR(50);
        `);

        console.log('Column "type" added successfully.');

    } catch (err) {
        console.error('Error adding column:', err);
    } finally {
        pool.end();
    }
}

addTypeColumn();
