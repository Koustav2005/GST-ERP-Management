const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'gst_management',
    password: process.env.DB_PASSWORD || 'admin123',
    port: process.env.DB_PORT || 5432,
});

async function dropAllData() {
    const client = await pool.connect();

    try {
        console.log('🗑️  Starting to drop all data from database...\n');

        await client.query('BEGIN');

        // Get all tables in the public schema
        const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

        if (tablesResult.rows.length === 0) {
            console.log('ℹ️  No tables found in database\n');
            await client.query('COMMIT');
            return;
        }

        console.log(`📋 Found ${tablesResult.rows.length} tables to drop:\n`);
        tablesResult.rows.forEach(row => {
            console.log(`   - ${row.tablename}`);
        });
        console.log('');

        // Drop all tables with CASCADE to handle foreign keys
        console.log('🔨 Dropping all tables...\n');
        for (const row of tablesResult.rows) {
            const tableName = row.tablename;
            await client.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
            console.log(`   ✅ Dropped: ${tableName}`);
        }

        await client.query('COMMIT');

        console.log('\n✅ All data dropped successfully!\n');
        console.log('Summary:');
        console.log(`  - Dropped ${tablesResult.rows.length} tables`);
        console.log('  - Database is now empty');
        console.log('\nNext steps:');
        console.log('  1. Run setup script to recreate tables');
        console.log('  2. Create a new Management user account');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Drop failed:', error.message);
        console.error('Full error:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the drop
dropAllData()
    .then(() => {
        console.log('\n🎉 Drop script completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Drop script failed!');
        process.exit(1);
    });
