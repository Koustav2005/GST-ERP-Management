const fs = require('fs');
const pool = require('./config/database');

async function checkColumns() {
    try {
        const tables = ['major_orders', 'purchase_order_items', 'purchase_orders', 'materials_detail'];
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
        fs.writeFileSync('table_schemas_full.txt', output);
        console.log('Schemas written to table_schemas_full.txt');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkColumns();
