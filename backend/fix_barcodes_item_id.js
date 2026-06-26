const pool = require('./config/database');

async function fixBarcodes() {
    try {
        console.log('--- Fixing Barcodes Table for Item-level PO tracking ---');

        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'barcodes'::regclass AND attname = 'purchase_order_item_id') THEN
                    ALTER TABLE barcodes ADD COLUMN purchase_order_item_id INTEGER REFERENCES purchase_order_items(id) ON DELETE CASCADE;
                    CREATE INDEX idx_barcodes_purchase_order_item_id ON barcodes(purchase_order_item_id);
                END IF;
            END $$;
        `);
        console.log('✅ purchase_order_item_id added to barcodes');

        // Update Unique Constraints to be more precise
        console.log('Updating unique constraints...');
        const constraintResult = await pool.query(`
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'barcodes'::regclass AND contype = 'u';
        `);

        for (const row of constraintResult.rows) {
            console.log(`Dropping existing constraint: ${row.conname}`);
            await pool.query(`ALTER TABLE barcodes DROP CONSTRAINT ${row.conname}`);
        }

        // New constraints
        await pool.query(`
            ALTER TABLE barcodes ADD CONSTRAINT barcodes_legacy_unique UNIQUE (order_id, exp_date);
        `);
        await pool.query(`
            ALTER TABLE barcodes ADD CONSTRAINT barcodes_po_item_unique UNIQUE (purchase_order_item_id, exp_date);
        `);
        console.log('✅ Updated unique constraints');

        console.log('\n✅ Barcodes fix completed successfully.');
    } catch (error) {
        console.error('❌ Fix failed:', error.message);
    } finally {
        await pool.end();
    }
}

fixBarcodes();
