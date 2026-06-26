const pool = require('./config/database');

async function diagnose() {
    try {
        console.log('--- Database Diagnosis ---');

        // Check tables
        const tablesResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        const tables = tablesResult.rows.map(r => r.table_name);
        console.log('Existing tables:', tables.join(', '));

        const requiredTables = ['major_orders', 'order_receipts', 'order_receipt_items', 'purchase_orders'];
        for (const table of requiredTables) {
            if (tables.includes(table)) {
                console.log(`✅ Table "${table}" exists.`);
                const cols = await pool.query(`
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = $1
                `, [table]);
                console.log(`   Columns: ${cols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', ')}`);
            } else {
                console.log(`❌ Table "${table}" is MISSING!`);
            }
        }

    } catch (error) {
        console.error('❌ Diagnosis failed:', error.message);
    } finally {
        await pool.end();
    }
}

diagnose();
