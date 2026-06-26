const pool = require('./config/database');

async function listColumns() {
    try {
        console.log('Querying information_schema for purchase_orders...');
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'purchase_orders'
            ORDER BY ordinal_position
        `);
        console.log('COLUMN_LIST_START');
        console.log(JSON.stringify(result.rows, null, 2));
        console.log('COLUMN_LIST_END');
        process.exit(0);
    } catch (error) {
        console.error('Error listing columns:', error);
        process.exit(1);
    }
}

listColumns();
