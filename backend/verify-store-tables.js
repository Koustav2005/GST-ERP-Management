const pool = require('./config/database');

async function verifyTables() {
  try {
    console.log('Checking for store_requests tables...\n');
    
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('store_requests', 'store_request_items')
      ORDER BY table_name
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Tables NOT found! Creating them now...\n');
      
      // Create store_requests table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS store_requests (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          project_name VARCHAR(255) NOT NULL,
          project_manager_id INTEGER NOT NULL REFERENCES users(id),
          project_manager_name VARCHAR(255) NOT NULL,
          company_id INTEGER NOT NULL REFERENCES companies(id),
          requested_by INTEGER NOT NULL REFERENCES users(id),
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
          request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          response_date TIMESTAMP,
          responded_by INTEGER REFERENCES users(id),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✓ Created store_requests table');
      
      // Create store_request_items table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS store_request_items (
          id SERIAL PRIMARY KEY,
          request_id INTEGER NOT NULL REFERENCES store_requests(id) ON DELETE CASCADE,
          material_name VARCHAR(255) NOT NULL,
          quantity DECIMAL(10, 2) NOT NULL,
          unit VARCHAR(50) NOT NULL,
          hsn VARCHAR(50),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✓ Created store_request_items table');
      
      // Create indexes
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_store_requests_project_id ON store_requests(project_id)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_store_requests_company_id ON store_requests(company_id)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_store_requests_status ON store_requests(status)
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_store_request_items_request_id ON store_request_items(request_id)
      `);
      console.log('✓ Created indexes\n');
      
      console.log('✅ All tables created successfully!\n');
    } else {
      console.log('✅ Tables found:');
      result.rows.forEach(row => {
        console.log(`   ✓ ${row.table_name}`);
      });
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
  } finally {
    await pool.end();
  }
}

verifyTables();






