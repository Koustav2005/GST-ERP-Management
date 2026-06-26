const pool = require('./config/database');

(async () => {
    try {
        console.log('Adding assigned_to column to enquiries table...');

        await pool.query(`
            ALTER TABLE enquiries 
            ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id);
        `);

        console.log('✅ Column added successfully');
        await pool.end();
    } catch (error) {
        console.error('❌ Error updating enquiries table:', error);
        process.exit(1);
    }
})();
