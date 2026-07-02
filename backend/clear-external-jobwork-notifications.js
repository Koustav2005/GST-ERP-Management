const pool = require('./config/database');

async function clearNotifications() {
  const client = await pool.connect();
  try {
    console.log('Clearing external job work material notifications...');
    
    // Delete from external_jobwork_inventory
    await client.query('DELETE FROM external_jobwork_inventory WHERE 1=1');
    console.log('✓ Cleared external_jobwork_inventory');
    
    // Delete from external_jobwork_challans
    await client.query('DELETE FROM external_jobwork_challans WHERE 1=1');
    console.log('✓ Cleared external_jobwork_challans');
    
    // Delete from external_jobwork_material_notifications
    await client.query('DELETE FROM external_jobwork_material_notifications WHERE 1=1');
    console.log('✓ Cleared external_jobwork_material_notifications');
    
    console.log('✅ All external job work material notifications cleared!');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing notifications:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

clearNotifications();
