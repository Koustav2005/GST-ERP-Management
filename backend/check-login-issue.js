const pool = require('./config/database');

(async () => {
    try {
        const email = 'saurabhks102@gmail.com';

        // Find user with this email
        const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.role, u.is_approved, u.created_at, c.name as company_name 
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id 
      WHERE u.email = $1
    `, [email]);

        console.log('\n=== User Lookup ===');
        console.log('Email:', email);

        if (result.rows.length === 0) {
            console.log('❌ No user found with this email');
            console.log('\nSearching for similar emails...');

            const similar = await pool.query(`
        SELECT email FROM users WHERE email LIKE '%saurabh%'
      `);

            if (similar.rows.length > 0) {
                console.log('Found similar emails:');
                similar.rows.forEach(row => console.log(`  - ${row.email}`));
            }
        } else {
            const user = result.rows[0];
            console.log('\n✅ User found:');
            console.log('Name:', user.name);
            console.log('Email:', user.email);
            console.log('Role:', user.role);
            console.log('Company:', user.company_name || 'N/A');
            console.log('Approved:', user.is_approved);
            console.log('Created:', user.created_at);

            if (!user.is_approved) {
                console.log('\n⚠️  ISSUE: Account is NOT approved');
                console.log('This user needs to be approved by management before they can login.');
            } else {
                console.log('\n✅ Account is approved - should be able to login');
                console.log('\nPossible issues:');
                console.log('1. Incorrect password');
                console.log('2. Check if backend server is running');
                console.log('3. Check network connection');
            }
        }

        await pool.end();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
