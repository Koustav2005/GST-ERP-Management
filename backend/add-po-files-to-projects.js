const pool = require('./config/database');

async function addPoFilesToProjects() {
    try {
        console.log('Adding PO file columns to projects table...');
        await pool.query(`
            ALTER TABLE projects 
            ADD COLUMN IF NOT EXISTS po_filename TEXT,
            ADD COLUMN IF NOT EXISTS po_path TEXT
        `);
        console.log('✅ Added po_filename and po_path columns');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding PO file columns:', error);
        process.exit(1);
    }
}

addPoFilesToProjects();
