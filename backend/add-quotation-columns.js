const pool = require('./config/database');

async function updateEnquiriesTable() {
    try {
        console.log('Starting enquiries table update...');

        // Add quotation_filename column
        await pool.query(`
            ALTER TABLE enquiries 
            ADD COLUMN IF NOT EXISTS quotation_filename TEXT
        `);
        console.log('Added quotation_filename column');

        // Add quotation_path column
        await pool.query(`
            ALTER TABLE enquiries 
            ADD COLUMN IF NOT EXISTS quotation_path TEXT
        `);
        console.log('Added quotation_path column');

        // Add quotation_uploaded_at column
        await pool.query(`
            ALTER TABLE enquiries 
            ADD COLUMN IF NOT EXISTS quotation_uploaded_at TIMESTAMP
        `);
        console.log('Added quotation_uploaded_at column');

        console.log('Enquiries table update completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error updating enquiries table:', error);
        process.exit(1);
    }
}

updateEnquiriesTable();
