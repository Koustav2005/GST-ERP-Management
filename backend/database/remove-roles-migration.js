const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'gst_management',
    password: process.env.DB_PASSWORD || 'admin123',
    port: process.env.DB_PORT || 5432,
});

async function removeRolesMigration() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting role removal migration...\n');

        await client.query('BEGIN');

        // Step 1: Check existing users
        console.log('📋 Step 1: Checking existing users...');
        const usersCheck = await client.query('SELECT id, name, email, role FROM users');
        console.log(`   Found ${usersCheck.rows.length} total users:`);
        usersCheck.rows.forEach(user => {
            console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}`);
        });
        console.log('');

        // Step 2: Delete non-management users (REQUIRED for constraint)
        const nonManagementUsers = await client.query(`SELECT COUNT(*) as count FROM users WHERE role != 'management'`);
        const nonMgmtCount = nonManagementUsers.rows[0].count;

        if (nonMgmtCount > 0) {
            console.log(`📋 Step 2: Deleting ${nonMgmtCount} non-management users...`);
            console.log('   ⚠️  This is required to add the management-only constraint');
            const deleted = await client.query(`DELETE FROM users WHERE role != 'management' RETURNING name, email, role`);
            deleted.rows.forEach(user => {
                console.log(`   - Deleted: ${user.name} (${user.email}) - ${user.role}`);
            });
            console.log('✅ Non-management users deleted\n');
        } else {
            console.log('📋 Step 2: No non-management users to delete\n');
        }

        // Step 3: Drop vendor-related tables
        console.log('📋 Step 3: Dropping vendor-related tables...');
        await client.query('DROP TABLE IF EXISTS bid_items CASCADE');
        await client.query('DROP TABLE IF EXISTS vendor_bids CASCADE');
        await client.query('DROP TABLE IF EXISTS demand_items CASCADE');
        await client.query('DROP TABLE IF EXISTS vendor_demands CASCADE');
        console.log('✅ Vendor tables dropped\n');

        // Step 4: Remove project assignment columns
        console.log('📋 Step 4: Removing project assignment columns...');
        await client.query('ALTER TABLE projects DROP COLUMN IF EXISTS assigned_to CASCADE');
        await client.query('ALTER TABLE projects DROP COLUMN IF EXISTS assigned_to_role CASCADE');
        await client.query('ALTER TABLE projects DROP COLUMN IF EXISTS assigned_to_name CASCADE');
        console.log('✅ Project assignment columns removed\n');

        // Step 5: Remove gstin column from users table
        console.log('📋 Step 5: Removing gstin column from users...');
        await client.query('ALTER TABLE users DROP COLUMN IF EXISTS gstin CASCADE');
        console.log('✅ GSTIN column removed\n');

        // Step 6: Update users table role constraint
        console.log('📋 Step 6: Updating users table role constraint...');
        // First, drop the existing constraint
        const constraintCheck = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'users' 
      AND constraint_type = 'CHECK' 
      AND constraint_name LIKE '%role%'
    `);

        if (constraintCheck.rows.length > 0) {
            const constraintName = constraintCheck.rows[0].constraint_name;
            await client.query(`ALTER TABLE users DROP CONSTRAINT ${constraintName}`);
            console.log(`   Dropped existing constraint: ${constraintName}`);
        }

        // Add new constraint for management only
        await client.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check 
      CHECK (role = 'management')
    `);
        console.log('✅ Role constraint updated to only allow management\n');

        await client.query('COMMIT');

        console.log('✅ Migration completed successfully!\n');
        console.log('Summary of changes:');
        console.log(`  - Deleted ${nonMgmtCount} non-management users`);
        console.log('  - Dropped vendor_demands, demand_items, vendor_bids, bid_items tables');
        console.log('  - Removed assigned_to, assigned_to_role, assigned_to_name from projects');
        console.log('  - Removed gstin column from users');
        console.log('  - Updated role constraint to only allow management');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
removeRolesMigration()
    .then(() => {
        console.log('\n🎉 Migration script completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration script failed!');
        process.exit(1);
    });
