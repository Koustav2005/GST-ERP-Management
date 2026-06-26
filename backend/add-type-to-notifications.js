const pool = require('./config/database');

(async () => {
    try {
        console.log('Checking notifications table structure...');

        // Check if type column exists
        const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'notifications' AND column_name = 'type';
    `);

        if (columnCheck.rows.length === 0) {
            console.log('Adding type column to notifications table...');

            await pool.query(`
        ALTER TABLE notifications 
        ADD COLUMN IF NOT EXISTS type VARCHAR(50);
      `);

            console.log('✅ Type column added successfully');
        } else {
            console.log('✅ Type column already exists');
        }

        await pool.end();
        console.log('✅ Migration completed');
    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
})();
