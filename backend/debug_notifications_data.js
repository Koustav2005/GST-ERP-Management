const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'gst_svcee',
    password: process.env.DB_PASSWORD || 'admin123',
    port: process.env.DB_PORT || 5432,
});

async function checkData() {
    try {
        console.log('--- Checking Notifications Table ---');

        // Count total notifications
        const countRes = await pool.query('SELECT COUNT(*) FROM notifications');
        console.log('Total notifications:', countRes.rows[0].count);

        // List last 10 notifications
        const listRes = await pool.query('SELECT id, user_id, title, read, created_at FROM notifications ORDER BY created_at DESC LIMIT 10');
        console.log('Recent notifications:', listRes.rows);

        // Check distinct users who have notifications
        const usersRes = await pool.query('SELECT DISTINCT user_id FROM notifications');
        console.log('User IDs with notifications:', usersRes.rows.map(r => r.user_id));

    } catch (err) {
        console.error('Error checking data:', err);
    } finally {
        pool.end();
    }
}

checkData();
