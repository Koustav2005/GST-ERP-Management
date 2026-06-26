const pool = require('./config/database');

async function addVehicleWeightUnit() {
    try {
        console.log('Adding vehicle_weight_unit column to order_receipts table...');

        await pool.query(`
            ALTER TABLE order_receipts 
            ADD COLUMN IF NOT EXISTS vehicle_weight_unit VARCHAR(20) DEFAULT 'kg'
        `);

        console.log('✅ Added vehicle_weight_unit column');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error fixing table:', error);
        process.exit(1);
    }
}

addVehicleWeightUnit();
