const pool = require('./config/database');

async function initBarcodes() {
    try {
        console.log('--- Initializing Barcodes Table with PO Support ---');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS barcodes (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES major_orders(id) ON DELETE CASCADE,
                purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
                company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
                item_name VARCHAR(255) NOT NULL,
                hsn VARCHAR(50),
                purchased_date DATE NOT NULL,
                mfg_date DATE NOT NULL,
                exp_date DATE NOT NULL,
                qr_number VARCHAR(255) UNIQUE,
                barcode_data TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Barcodes table created');

        // Add indexes
        await pool.query('CREATE INDEX IF NOT EXISTS idx_barcodes_order_id ON barcodes(order_id);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_barcodes_purchase_order_id ON barcodes(purchase_order_id);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_barcodes_company_id ON barcodes(company_id);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_barcodes_item_name ON barcodes(item_name);');
        console.log('✅ Indexes created');

        // Add constraints if they don't exist
        try {
            await pool.query('ALTER TABLE barcodes ADD CONSTRAINT barcodes_order_id_exp_date_key UNIQUE (order_id, exp_date);');
            console.log('✅ Added order_id unique constraint');
        } catch (e) { }

        try {
            await pool.query('ALTER TABLE barcodes ADD CONSTRAINT barcodes_purchase_order_id_exp_date_key UNIQUE (purchase_order_id, exp_date);');
            console.log('✅ Added purchase_order_id unique constraint');
        } catch (e) { }

        console.log('\n✅ Barcodes initialization completed successfully.');
    } catch (error) {
        console.error('❌ Initialization failed:', error.message);
    } finally {
        await pool.end();
    }
}

initBarcodes();
