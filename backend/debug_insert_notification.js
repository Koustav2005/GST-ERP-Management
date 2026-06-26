const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'gst_svcee',
    password: process.env.DB_PASSWORD || 'admin123',
    port: process.env.DB_PORT || 5432,
});

async function insertTestNotifications() {
    try {
        console.log('--- Inserting Test Notifications ---');

        // Get all users
        const usersRes = await pool.query('SELECT id, name, role FROM users');
        const users = usersRes.rows;
        console.log(`Found ${users.length} users.`);

        for (const user of users) {
            await pool.query(`
                INSERT INTO notifications (user_id, title, message, read)
                VALUES ($1, 'System Test', $2, false)
            `, [user.id, `Test notification for ${user.name} (${user.role}) at ${new Date().toLocaleTimeString()}`]);
            console.log(`Inserted test notification for user ${user.id} (${user.name})`);
        }

        console.log('Done.');

    } catch (err) {
        console.error('Error inserting notifications:', err);
    } finally {
        pool.end();
    }
}

insertTestNotifications();
