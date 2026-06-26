const pool = require('./config/database');

async function addStoreInchargeToJobWork() {
  try {
    console.log('📦 Adding store_incharge_id column to job_work_requests...\n');

    // Check if column already exists
    const checkRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='job_work_requests' AND column_name='store_incharge_id'
    `);

    if (checkRes.rows.length > 0) {
      console.log('✅ store_incharge_id column already exists. No changes needed.');
      process.exit(0);
    }

    // Add store_incharge_id column
    await pool.query(`
      ALTER TABLE job_work_requests
      ADD COLUMN store_incharge_id INT REFERENCES users(id) ON DELETE CASCADE
    `);

    console.log('✅ store_incharge_id column added successfully!');
    console.log('📋 Changes made:');
    console.log('  - Added store_incharge_id column to job_work_requests table');
    console.log('\n💡 Note: Job work is now sent to store_incharge, and challan is sent to accountant');

  } catch (error) {
    console.error('❌ Error adding store_incharge_id column:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addStoreInchargeToJobWork();
