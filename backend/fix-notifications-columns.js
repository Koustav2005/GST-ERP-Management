const pool = require('./config/database');

async function fixNotificationsTable() {
    try {
        console.log('Adding project_id column to notifications table...');

        await pool.query(`
            ALTER TABLE projects 
            ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE
        `);
        // WAIT - I meant notifications table!

        await pool.query(`
            ALTER TABLE notifications 
            ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE
        `);
        console.log('✅ Added project_id column to notifications');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing notifications table:', error);
        process.exit(1);
    }
}

fixNotificationsTable();
