const pool = require('./config/database');

async function fixProjectsTable() {
    try {
        console.log('Adding missing columns to projects table...');

        // Add assigned_to
        await pool.query(`
            ALTER TABLE projects 
            ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id)
        `);
        console.log('✅ Added assigned_to column');

        // Add priority
        await pool.query(`
            ALTER TABLE projects 
            ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'medium'
        `);
        console.log('✅ Added priority column');

        // Add start_date
        await pool.query(`
            ALTER TABLE projects 
            ADD COLUMN IF NOT EXISTS start_date DATE
        `);
        console.log('✅ Added start_date column');

        // Add end_date
        await pool.query(`
            ALTER TABLE projects 
            ADD COLUMN IF NOT EXISTS end_date DATE
        `);
        console.log('✅ Added end_date column');

        // Add npd_user_id
        await pool.query(`
            ALTER TABLE projects 
            ADD COLUMN IF NOT EXISTS npd_user_id INTEGER REFERENCES users(id)
        `);
        console.log('✅ Added npd_user_id column');

        console.log('✅ Projects table fixed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing projects table:', error);
        process.exit(1);
    }
}

fixProjectsTable();
