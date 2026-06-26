const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Adding receipt_status column to order_receipts...');

        // Add receipt_status column: 'complete' or 'partial'
        await client.query(`
      ALTER TABLE order_receipts
      ADD COLUMN IF NOT EXISTS receipt_status VARCHAR(20) DEFAULT 'complete'
        CHECK (receipt_status IN ('complete', 'partial'))
    `);

        // Add total_quantity_received to track cumulative quantities across multiple partial submissions
        await client.query(`
      ALTER TABLE order_receipts
      ADD COLUMN IF NOT EXISTS total_quantity_received DECIMAL(10, 2) DEFAULT 0
    `);

        // Backfill existing records - mark all existing receipts as 'complete' (they were submitted under old rules)
        await client.query(`
      UPDATE order_receipts SET receipt_status = 'complete' WHERE receipt_status IS NULL
    `);

        console.log('✅ Migration completed successfully!');
        console.log('   - Added receipt_status column (complete/partial)');
        console.log('   - Added total_quantity_received column');
        console.log('   - Backfilled existing receipts as complete');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(console.error);
