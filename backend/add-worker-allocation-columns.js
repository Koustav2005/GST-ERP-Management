const pool = require('./config/database');

async function addWorkerAllocationColumns() {
  try {
    console.log('Adding worker allocation columns to store_requests table...\n');
    
    // Add columns
    await pool.query(`
      ALTER TABLE store_requests 
      ADD COLUMN IF NOT EXISTS allocated_to_worker_id INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS allocated_to_worker_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS allocated_at TIMESTAMP
    `);
    console.log('✓ Added worker allocation columns');
    
    // Create index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_store_requests_allocated_to_worker 
      ON store_requests(allocated_to_worker_id)
    `);
    console.log('✓ Created index\n');
    
    console.log('✅ Worker allocation columns added successfully!\n');
    
  } catch (error) {
    console.error('❌ Error adding columns:', error.message);
    console.error('Details:', error);
  } finally {
    await pool.end();
  }
}

addWorkerAllocationColumns();






