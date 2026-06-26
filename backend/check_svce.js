const pool = require('./config/database');

async function checkSVCEData() {
    try {
        console.log('Checking SVCE company data...\n');

        // Check if SVCE company exists
        const company = await pool.query("SELECT * FROM companies WHERE name ILIKE '%SVCE%'");
        console.log('Companies found:', company.rows.length);
        if (company.rows.length > 0) {
            console.log('Company:', company.rows[0]);
        }

        // Check users
        const users = await pool.query("SELECT id, name, email, role FROM users WHERE company_id = 1");
        console.log('\nUsers in SVCE company:', users.rows.length);
        users.rows.forEach(u => console.log(`  - ${u.name} (${u.email}) - ${u.role}`));

        // Check projects
        const projects = await pool.query("SELECT id, name FROM projects WHERE company_id = 1");
        console.log('\nProjects in SVCE company:', projects.rows.length);
        projects.rows.forEach(p => console.log(`  - ${p.name}`));

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        pool.end();
    }
}

checkSVCEData();
