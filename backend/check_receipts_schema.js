const fs = require('fs');
const pool = require('./config/database');

async function checkColumns() {
    try {
        const tables = ['order_receipts', 'order_receipt_items'];
        let output = '';
        for (const table of tables) {
            const res = await pool.query(`
                SELECT column_name
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [table]);
            const cols = res.rows.map(r => r.column_name).join(', ');
            output += `${table}: ${cols}\n\n`;
        }
        fs.writeFileSync('table_schemas_receipts.txt', output);
        console.log('Schemas written to table_schemas_receipts.txt');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkColumns();
