const pool = require('./config/database');

async function fixDatabase() {
    try {
        console.log('Checking purchase_orders table...');

        // 1. Check for updated_at in purchase_orders
        const poCheck = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'purchase_orders' AND column_name = 'updated_at'
        `);

        if (poCheck.rows.length === 0) {
            console.log('Adding updated_at to purchase_orders...');
            await pool.query('ALTER TABLE purchase_orders ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
            console.log('Added updated_at to purchase_orders');
        } else {
            console.log('updated_at already exists in purchase_orders');
        }

        // 2. Check for major_orders table
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'major_orders'
            )
        `);

        if (tableCheck.rows[0].exists) {
            console.log('Checking major_orders table columns...');
            const majorCheck = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'major_orders' AND column_name = 'updated_at'
            `);

            if (majorCheck.rows.length === 0) {
                console.log('Adding updated_at to major_orders...');
                await pool.query('ALTER TABLE major_orders ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
                console.log('Added updated_at to major_orders');
            } else {
                console.log('updated_at already exists in major_orders');
            }
        } else {
            console.log('major_orders table does not exist');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error fixing database:', error);
        process.exit(1);
    }
}

fixDatabase();
