const pool = require('./config/database');

async function fixTables() {
  try {
    console.log('========================================');
    console.log('Creating Store Requests Tables');
    console.log('========================================\n');
    
    // Create store_requests table
    console.log('Creating store_requests table...');
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
        allocated_to_worker_id INTEGER REFERENCES users(id),
        allocated_to_worker_name VARCHAR(255),
        allocated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ store_requests table created\n');
    
    // Create store_request_items table
    console.log('Creating store_request_items table...');
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
    console.log('✓ store_request_items table created\n');
    
    // Create indexes
    console.log('Creating indexes...');
    try {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_store_requests_project_id ON store_requests(project_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_store_requests_company_id ON store_requests(company_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_store_requests_status ON store_requests(status)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_store_requests_allocated_to_worker ON store_requests(allocated_to_worker_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_store_request_items_request_id ON store_request_items(request_id)');
      console.log('✓ Indexes created\n');
    } catch (idxError) {
      console.log('⚠ Index creation skipped (may already exist)\n');
    }
    
    // Verify
    console.log('Verifying tables...');
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('store_requests', 'store_request_items')
      ORDER BY table_name
    `);
    
    console.log(`\n✅ SUCCESS! Found ${result.rows.length} tables:`);
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    console.log('\n========================================');
    console.log('Setup Complete!');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.code) {
      console.error('PostgreSQL Error Code:', error.code);
    }
    console.error('\nFull error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

fixTables();

