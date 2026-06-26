const pool = require('./config/database');

(async () => {
    try {
        console.log('Testing send to NPD query...');

        // Test the NPD users query
        const npdUsers = await pool.query(
            `SELECT id, name FROM users 
       WHERE company_id = $1 AND role = 'npd' AND approved = true`,
            [1]
        );

        console.log('NPD users found:', npdUsers.rows.length);
        console.log('NPD users:', npdUsers.rows);

        if (npdUsers.rows.length > 0) {
            // Test notification insert
            console.log('\nTesting notification insert...');
            const testResult = await pool.query(
                `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, $2, $3, $4) RETURNING *`,
                [
                    npdUsers.rows[0].id,
                    'Test Enquiry',
                    'This is a test notification',
                    'enquiry_assigned'
                ]
            );
            console.log('✅ Notification created:', testResult.rows[0]);

            // Clean up test notification
            await pool.query('DELETE FROM notifications WHERE id = $1', [testResult.rows[0].id]);
            console.log('✅ Test notification deleted');
        }

        await pool.end();
        console.log('\n✅ Test completed');
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        await pool.end();
        process.exit(1);
    }
})();
