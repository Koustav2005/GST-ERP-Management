const pool = require('./config/database');

async function migrateBarcodes() {
    try {
        console.log('--- Migrating Barcodes Table to Support Purchase Orders ---');

        // 1. Update order_id to be nullable
        console.log('Making order_id nullable in barcodes table...');
        await pool.query(`
            ALTER TABLE barcodes ALTER COLUMN order_id DROP NOT NULL;
        `);
        console.log('✅ order_id is now nullable in barcodes');

        // 2. Add purchase_order_id column
        console.log('Adding purchase_order_id column to barcodes table...');
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'barcodes'::regclass AND attname = 'purchase_order_id') THEN
                    ALTER TABLE barcodes ADD COLUMN purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE;
                    CREATE INDEX idx_barcodes_purchase_order_id ON barcodes(purchase_order_id);
                END IF;
            END $$;
        `);
        console.log('✅ purchase_order_id added to barcodes');

        // 3. Update Unique Constraints
        console.log('Updating unique constraints...');
        // First, find the name of the existing constraint on (order_id, exp_date)
        const constraintResult = await pool.query(`
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'barcodes'::regclass AND contype = 'u';
        `);

        for (const row of constraintResult.rows) {
            console.log(`Dropping existing constraint: ${row.conname}`);
            await pool.query(`ALTER TABLE barcodes DROP CONSTRAINT ${row.conname}`);
        }

        // Add separate unique constraints
        await pool.query(`
            ALTER TABLE barcodes ADD CONSTRAINT barcodes_order_id_exp_date_key UNIQUE NULLS NOT DISTINCT (order_id, exp_date);
        `);
        await pool.query(`
            ALTER TABLE barcodes ADD CONSTRAINT barcodes_purchase_order_id_exp_date_key UNIQUE NULLS NOT DISTINCT (purchase_order_id, exp_date);
        `);
        console.log('✅ Updated unique constraints to support both order types');

        console.log('\n✅ Migration completed successfully.');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

migrateBarcodes();
