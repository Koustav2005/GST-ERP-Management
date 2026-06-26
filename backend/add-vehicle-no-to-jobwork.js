const pool = require('./config/database');

async function addVehicleNumberToJobWork() {
  try {
    console.log('📦 Adding vehicle_no column to job_work_requests...\n');

    // Check if column already exists
    const checkRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='job_work_requests' AND column_name='vehicle_no'
    `);

    if (checkRes.rows.length > 0) {
      console.log('✅ vehicle_no column already exists. No changes needed.');
      process.exit(0);
    }

    // Add vehicle_no column
    await pool.query(`
      ALTER TABLE job_work_requests
      ADD COLUMN vehicle_no VARCHAR(50)
    `);

    console.log('✅ vehicle_no column added successfully!');
    console.log('📋 Changes made:');
    console.log('  - Added vehicle_no column to job_work_requests table');
    console.log('  - Column type: VARCHAR(50)');
    console.log('  - Nullable: Yes (optional field)');
    console.log('\n💡 Run this script once to update existing database.');

  } catch (error) {
    console.error('❌ Error adding vehicle_no column:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addVehicleNumberToJobWork();
