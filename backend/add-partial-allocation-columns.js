const pool = require('./config/database');

async function addPartialAllocationColumns() {
  try {
    console.log('Adding partial allocation support...\n');
    
    // Add allocated_quantity to store_request_items
    await pool.query(`
      ALTER TABLE store_request_items 
      ADD COLUMN IF NOT EXISTS allocated_quantity DECIMAL(10, 2) DEFAULT 0
    `);
    console.log('✓ Added allocated_quantity column to store_request_items');
    
    // Update status constraint to include 'partially_allocated'
    await pool.query(`
      ALTER TABLE store_requests 
      DROP CONSTRAINT IF EXISTS store_requests_status_check
    `);
    
    await pool.query(`
      ALTER TABLE store_requests 
      ADD CONSTRAINT store_requests_status_check 
      CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled', 'partially_allocated'))
    `);
    console.log('✓ Updated status constraint to include partially_allocated\n');
    
    console.log('✅ Partial allocation support added successfully!\n');
    
  } catch (error) {
    console.error('❌ Error adding partial allocation:', error.message);
    console.error('Details:', error);
  } finally {
    await pool.end();
  }
}

addPartialAllocationColumns();






