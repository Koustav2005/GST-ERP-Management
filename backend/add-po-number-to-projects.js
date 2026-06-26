const pool = require('./config/database');

async function addPONumberColumn() {
    try {
        console.log('Adding po_number column to projects table...');

        await pool.query(`
            ALTER TABLE projects 
            ADD COLUMN IF NOT EXISTS po_number VARCHAR(100) UNIQUE
        `);
        console.log('✅ Added po_number column');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating projects table:', error);
        process.exit(1);
    }
}

addPONumberColumn();
