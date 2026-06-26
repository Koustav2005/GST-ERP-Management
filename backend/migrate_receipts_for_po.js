const pool = require('./config/database');

async function migrateReceipts() {
    try {
        console.log('--- Migrating Receipt Tables to Support Purchase Orders ---');

        // 1. Update order_receipts
        console.log('Updating order_receipts table...');
        await pool.query(`
            ALTER TABLE order_receipts ALTER COLUMN order_id DROP NOT NULL;
        `);
        console.log('✅ order_id is now nullable in order_receipts');

        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'order_receipts'::regclass AND attname = 'purchase_order_id') THEN
                    ALTER TABLE order_receipts ADD COLUMN purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE;
                    CREATE INDEX idx_order_receipts_purchase_order_id ON order_receipts(purchase_order_id);
                END IF;
            END $$;
        `);
        console.log('✅ purchase_order_id added to order_receipts');

        // 2. Update order_receipt_items
        console.log('\nUpdating order_receipt_items table...');
        await pool.query(`
            ALTER TABLE order_receipt_items ALTER COLUMN order_id DROP NOT NULL;
        `);
        console.log('✅ order_id is now nullable in order_receipt_items');

        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'order_receipt_items'::regclass AND attname = 'purchase_order_item_id') THEN
                    ALTER TABLE order_receipt_items ADD COLUMN purchase_order_item_id INTEGER REFERENCES purchase_order_items(id) ON DELETE CASCADE;
                    CREATE INDEX idx_order_receipt_items_purchase_order_item_id ON order_receipt_items(purchase_order_item_id);
                END IF;
            END $$;
        `);
        console.log('✅ purchase_order_item_id added to order_receipt_items');

        console.log('\n✅ Migration completed successfully.');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

migrateReceipts();
