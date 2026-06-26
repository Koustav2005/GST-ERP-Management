const pool = require('./config/database');

async function deleteAllJobWorks() {
  const client = await pool.connect();
  try {
    console.log('🗑️ Starting deletion of all job work records...\n');

    // Delete job work images
    console.log('Deleting job work images...');
    const imagesResult = await client.query('DELETE FROM job_work_images');
    console.log(`✅ Deleted ${imagesResult.rowCount} image records\n`);

    // Delete job work items
    console.log('Deleting job work items...');
    const itemsResult = await client.query('DELETE FROM job_work_items');
    console.log(`✅ Deleted ${itemsResult.rowCount} item records\n`);

    // Delete job work requests
    console.log('Deleting job work requests...');
    const requestsResult = await client.query('DELETE FROM job_work_requests');
    console.log(`✅ Deleted ${requestsResult.rowCount} job work request records\n`);

    console.log('═'.repeat(50));
    console.log('✅ All job work records deleted successfully!');
    console.log('═'.repeat(50));
    console.log('\n📋 Summary:');
    console.log(`  - Images deleted: ${imagesResult.rowCount}`);
    console.log(`  - Items deleted: ${itemsResult.rowCount}`);
    console.log(`  - Requests deleted: ${requestsResult.rowCount}`);
    console.log(`  - Total records: ${imagesResult.rowCount + itemsResult.rowCount + requestsResult.rowCount}\n`);

  } catch (error) {
    console.error('❌ Error deleting job work records:', error.message);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
}

deleteAllJobWorks();
