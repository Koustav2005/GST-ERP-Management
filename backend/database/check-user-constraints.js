const pool = require('../config/database');

async function checkConstraints() {
    try {
        console.log('Querying table constraints on users table...');
        
        // Query check constraints
        const res = await pool.query(`
            SELECT 
                con.conname AS constraint_name,
                pg_get_constraintdef(con.oid) AS constraint_definition
            FROM 
                pg_constraint con
            INNER JOIN 
                pg_class rel ON rel.oid = con.conrelid
            INNER JOIN 
                pg_namespace nsp ON nsp.oid = rel.relnamespace
            WHERE 
                rel.relname = 'users';
        `);
        
        console.log('Constraints on users table:');
        console.log(JSON.stringify(res.rows, null, 2));

        // Let's also check column types
        const colRes = await pool.query(`
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);
        console.log('\nColumns in users table:');
        console.log(JSON.stringify(colRes.rows, null, 2));

    } catch (err) {
        console.error('Error querying database:', err);
    } finally {
        pool.end();
    }
}

checkConstraints();
