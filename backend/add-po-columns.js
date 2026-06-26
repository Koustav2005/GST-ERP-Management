const pool = require('./config/database');

async function addPOColumns() {
    try {
        console.log('Starting enquiries table update for PO columns...');

        // Add po_filename column
        await pool.query(`
            ALTER TABLE enquiries 
            ADD COLUMN IF NOT EXISTS po_filename TEXT
        `);
        console.log('Added po_filename column');

        // Add po_path column
        await pool.query(`
            ALTER TABLE enquiries 
            ADD COLUMN IF NOT EXISTS po_path TEXT
        `);
        console.log('Added po_path column');

        // Add po_uploaded_at column
        await pool.query(`
            ALTER TABLE enquiries 
            ADD COLUMN IF NOT EXISTS po_uploaded_at TIMESTAMP
        `);
        console.log('Added po_uploaded_at column');

        console.log('Enquiries table update completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error updating enquiries table:', error);
        process.exit(1);
    }
}

addPOColumns();
