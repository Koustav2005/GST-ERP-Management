const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'gst_management',
    password: process.env.DB_PASSWORD || 'admin123',
    port: process.env.DB_PORT || 5432,
});

async function addEmployeeRoles() {
    const client = await pool.connect();

    try {
        console.log('🚀 Adding employee roles and approval system...\n');

        await client.query('BEGIN');

        // Step 1: Add approval columns to users table
        console.log('📋 Step 1: Adding approval columns to users table...');

        // Add is_approved column (default TRUE for existing management users)
        await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE
    `);

        // Add approved_by column
        await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id)
    `);

        // Add approved_at column
        await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP
    `);

        console.log('✅ Approval columns added\n');

        // Step 2: Update role constraint
        console.log('📋 Step 2: Updating role constraint...');

        // Drop existing constraint
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

        // Add new constraint with employee roles
        await client.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN ('management', 'accountant', 'store_incharge', 'npd'))
    `);
        console.log('✅ Role constraint updated to allow employee roles\n');

        // Step 3: Set approved_at for existing management users
        console.log('📋 Step 3: Setting approval timestamps for existing users...');
        await client.query(`
      UPDATE users 
      SET approved_at = created_at 
      WHERE role = 'management' AND approved_at IS NULL
    `);
        console.log('✅ Approval timestamps set\n');

        await client.query('COMMIT');

        console.log('✅ Migration completed successfully!\n');
        console.log('Summary of changes:');
        console.log('  - Added is_approved column (default TRUE)');
        console.log('  - Added approved_by column');
        console.log('  - Added approved_at column');
        console.log('  - Updated role constraint to allow: management, accountant, store_incharge, npd');
        console.log('\nEmployee roles are now supported!');

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
addEmployeeRoles()
    .then(() => {
        console.log('\n🎉 Migration script completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Migration script failed!');
        process.exit(1);
    });
