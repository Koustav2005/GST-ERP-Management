const pool = require('./config/database');

async function checkColumns() {
    try {
        const table = process.argv[2];
        const res = await pool.query(`
            SELECT column_name
            FROM information_schema.columns 
            WHERE table_name = $1
            ORDER BY ordinal_position
        `, [table]);
        const cols = res.rows.map(r => r.column_name).join(', ');
        console.log(`${table}: ${cols}`);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkColumns();
