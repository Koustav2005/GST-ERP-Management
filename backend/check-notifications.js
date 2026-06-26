const pool = require('./config/database');

(async () => {
    try {
        // Check if notifications table exists
        const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      );
    `);

        console.log('Notifications table exists:', tableCheck.rows[0].exists);

        if (tableCheck.rows[0].exists) {
            // Check table structure
            const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'notifications'
        ORDER BY ordinal_position;
      `);

            console.log('\nTable structure:');
            columns.rows.forEach(col => {
                console.log(`  ${col.column_name}: ${col.data_type}`);
            });

            // Check for notifications
            const notifications = await pool.query('SELECT * FROM notifications LIMIT 5');
            console.log(`\nNotifications count: ${notifications.rows.length}`);
            if (notifications.rows.length > 0) {
                console.log('Sample notification:', notifications.rows[0]);
            }
        } else {
            console.log('\n⚠️ Notifications table does NOT exist!');
            console.log('You need to create it first.');
        }

        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        await pool.end();
        process.exit(1);
    }
})();
