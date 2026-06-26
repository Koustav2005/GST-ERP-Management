const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'gst_svcee',
    password: process.env.DB_PASSWORD || 'admin123',
    port: process.env.DB_PORT || 5432,
});

async function checkColumns() {
    try {
        const tables = ['barcodes', 'inventory', 'store_request_items'];

        for (const table of tables) {
            console.log(`\nChecking table: ${table}`);
            const res = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'hsn';
      `, [table]);

            if (res.rows.length > 0) {
                console.log(`✅ 'hsn' column exists in ${table} (Type: ${res.rows[0].data_type})`);

                // Check for null values
                const dataRes = await pool.query(`SELECT count(*) as total, count(hsn) as with_hsn FROM ${table}`);
                console.log(`   Data: ${dataRes.rows[0].with_hsn} / ${dataRes.rows[0].total} rows have HSN`);

                if (dataRes.rows[0].with_hsn > 0) {
                    const sample = await pool.query(`SELECT hsn FROM ${table} WHERE hsn IS NOT NULL LIMIT 1`);
                    console.log(`   Sample HSN: ${sample.rows[0].hsn}`);
                }
            } else {
                console.log(`❌ 'hsn' column MISSING in ${table}`);
            }
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

checkColumns();
