const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'gst_management',
    password: process.env.DB_PASSWORD || 'admin123',
    port: process.env.DB_PORT || 5432,
});

async function migrateRoles() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting role update migration...\n');
        await client.query('BEGIN');

        // Step 1: Find existing check constraints containing 'role'
        const constraintCheck = await client.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'users' 
            AND constraint_type = 'CHECK' 
            AND constraint_name LIKE '%role%'
        `);

        if (constraintCheck.rows.length > 0) {
            for (const row of constraintCheck.rows) {
                const constraintName = row.constraint_name;
                await client.query(`ALTER TABLE users DROP CONSTRAINT ${constraintName}`);
                console.log(`   Dropped existing constraint: ${constraintName}`);
            }
        }

        // Step 2: Add new constraint with project_manager and worker included
        await client.query(`
            ALTER TABLE users 
            ADD CONSTRAINT users_role_check 
            CHECK (role IN ('management', 'accountant', 'accounts', 'store_incharge', 'npd', 'project_manager', 'worker', 'sales_executive', 'vendor'))
        `);
        console.log('✅ Role constraint updated in database successfully!');

        await client.query('COMMIT');
        console.log('\n🎉 Migration completed successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrateRoles();
