const pool = require('./config/database');

async function clearChallans() {
  const client = await pool.connect();
  try {
    console.log('Clearing pending external job work challans...');
    
    // Delete from external_jobwork_inventory
    await client.query('DELETE FROM external_jobwork_inventory WHERE 1=1');
    console.log('✓ Cleared external_jobwork_inventory');
    
    // Delete from external_jobwork_challans
    await client.query('DELETE FROM external_jobwork_challans WHERE 1=1');
    console.log('✓ Cleared external_jobwork_challans');
    
    console.log('✅ All pending challans cleared!');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing challans:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

clearChallans();
