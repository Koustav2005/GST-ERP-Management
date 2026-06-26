const pool = require('./config/database');

async function addCustomerRemarks() {
    try {
        console.log('Adding customer_remarks column to enquiries table...');

        await pool.query(`
            ALTER TABLE enquiries 
            ADD COLUMN IF NOT EXISTS customer_remarks TEXT
        `);
        console.log('✅ Added customer_remarks column');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating enquiries table:', error);
        process.exit(1);
    }
}

addCustomerRemarks();
