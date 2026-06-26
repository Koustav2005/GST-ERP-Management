const pool = require('./config/database');
require('dotenv').config();

async function fix() {
  try {
    console.log('Fixing bill_of_materials table...');
    
    // 1. Rename item_name to material_name
    await pool.query("ALTER TABLE bill_of_materials RENAME COLUMN item_name TO material_name");
    console.log('Renamed item_name to material_name');

    // 2. Make serial_number nullable
    await pool.query("ALTER TABLE bill_of_materials ALTER COLUMN serial_number DROP NOT NULL");
    console.log('Made serial_number nullable');

    // 3. Add estimated_cost and supplier columns
    await pool.query("ALTER TABLE bill_of_materials ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10, 2)");
    await pool.query("ALTER TABLE bill_of_materials ADD COLUMN IF NOT EXISTS supplier VARCHAR(255)");
    console.log('Added estimated_cost and supplier columns');

    process.exit(0);
  } catch (e) {
    console.error('Error during fix:', e.message);
    process.exit(1);
  }
}
fix();
