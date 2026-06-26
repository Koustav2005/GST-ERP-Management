const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'gst_svcee',
    password: process.env.DB_PASSWORD || 'admin123',
    port: process.env.DB_PORT || 5432,
});

async function checkTable() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'notifications';
        `);
        console.log('Notifications Table Columns:', res.rows);

        if (res.rows.length === 0) {
            console.log('Table notifications does NOT exist.');
        } else {
            console.log('Table notifications exists.');
        }
    } catch (err) {
        console.error('Error checking table:', err);
    } finally {
        pool.end();
    }
}

checkTable();
