const pool = require('./config/database');

(async () => {
    try {
        console.log('Checking enquiries data...');
        const result = await pool.query('SELECT id, enquiry_number, status, assigned_to FROM enquiries');
        console.table(result.rows);

        console.log('\nChecking users with role npd...');
        const users = await pool.query("SELECT id, name, role FROM users WHERE role = 'npd'");
        console.table(users.rows);

        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
