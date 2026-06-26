const pool = require('./config/database');

async function checkTables() {
    try {
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables in public schema:');
        result.rows.forEach(row => console.log(`- ${row.table_name}`));
    } catch (error) {
        console.error('Error listing tables:', error.message);
    } finally {
        await pool.end();
    }
}

checkTables();
