const pool = require('./config/database');

async function run() {
    try {
        const enquiries = await pool.query('SELECT * FROM enquiries');
        console.log('--- ENQUIRIES ---');
        enquiries.rows.forEach(r => {
            console.log(`ID: ${r.id}, Number: ${r.enquiry_number}, Status: ${r.status}, AssignedTo: ${r.assigned_to}, CompanyID: ${r.company_id}`);
        });

        const users = await pool.query("SELECT id, name, role, company_id FROM users WHERE role = 'npd'");
        console.log('\n--- NPD USERS ---');
        users.rows.forEach(u => {
            console.log(`ID: ${u.id}, Name: ${u.name}, Role: ${u.role}, CompanyID: ${u.company_id}`);
        });

        await pool.end();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
