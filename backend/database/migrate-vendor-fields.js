const pool = require('../config/database');

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('Starting migration: adding new vendor fields to master_vendors...');
        await client.query('BEGIN');

        // Main info fields
        await client.query('ALTER TABLE master_vendors ADD COLUMN IF NOT EXISTS vendor_type VARCHAR(100)');
        await client.query('ALTER TABLE master_vendors ADD COLUMN IF NOT EXISTS gst_number VARCHAR(100)');
        await client.query('ALTER TABLE master_vendors ADD COLUMN IF NOT EXISTS pan_number VARCHAR(100)');
        await client.query('ALTER TABLE master_vendors ADD COLUMN IF NOT EXISTS opening_balance NUMERIC(15, 2) DEFAULT 0');
        await client.query('ALTER TABLE master_vendors ADD COLUMN IF NOT EXISTS credit_period VARCHAR(100)');
        await client.query('ALTER TABLE master_vendors ADD COLUMN IF NOT EXISTS currency VARCHAR(50) DEFAULT \'INR\'');

        // Address fields
        await client.query('ALTER TABLE master_vendors ADD COLUMN IF NOT EXISTS state VARCHAR(100)');
        await client.query('ALTER TABLE master_vendors ADD COLUMN IF NOT EXISTS country VARCHAR(100)');
        await client.query('ALTER TABLE master_vendors ADD COLUMN IF NOT EXISTS pincode VARCHAR(20)');

        // Bank fields
        await client.query('ALTER TABLE master_vendors ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255)');
        await client.query('ALTER TABLE master_vendors ADD COLUMN IF NOT EXISTS account_number VARCHAR(100)');
        await client.query('ALTER TABLE master_vendors ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(50)');
        await client.query('ALTER TABLE master_vendors ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255)');
        await client.query('ALTER TABLE master_vendors ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255)');
        await client.query('ALTER TABLE master_vendors ADD COLUMN IF NOT EXISTS upi_id VARCHAR(255)');

        await client.query('COMMIT');
        console.log('✅ Migration successful: All new vendor fields added to master_vendors table!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
    } finally {
        client.release();
        pool.end();
    }
}

runMigration();
