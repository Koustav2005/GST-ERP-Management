const pool = require('./config/database');

(async () => {
    try {
        // Find users associated with Subhash Engineering
        const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, c.name as company_name 
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id 
      WHERE LOWER(c.name) LIKE '%subhash%' OR LOWER(u.name) LIKE '%subhash%'
      ORDER BY u.created_at DESC
    `);

        console.log('\n=== Subhash Engineering Users ===');
        console.log('Users found:', result.rows.length);

        result.rows.forEach(user => {
            console.log(`\nName: ${user.name}`);
            console.log(`Email: ${user.email}`);
            console.log(`Role: ${user.role}`);
            console.log(`Company: ${user.company_name || 'N/A'}`);
        });

        if (result.rows.length === 0) {
            console.log('\nNo users found for Subhash Engineering.');
            console.log('Checking all companies...\n');

            const companies = await pool.query('SELECT * FROM companies ORDER BY created_at DESC');
            console.log('All companies in database:');
            companies.rows.forEach(c => {
                console.log(`- ${c.name} (ID: ${c.id})`);
            });
        }

        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
