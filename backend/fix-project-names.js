const pool = require('./config/database');

async function fixProjectNames() {
    try {
        console.log('Updating existing project names to match PO numbers...');
        const res = await pool.query("UPDATE projects SET name = po_number WHERE name LIKE 'Project EN%' AND po_number IS NOT NULL");
        console.log(`✅ Updated ${res.rowCount} project names`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating project names:', error);
        process.exit(1);
    }
}

fixProjectNames();
