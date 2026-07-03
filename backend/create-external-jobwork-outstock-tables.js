const pool = require('./config/database');

async function createExternalJobworkOutstockTables() {
  try {
    console.log('🔧 Creating External Job Work Outstock tables...');

    // 1. Create external_jobwork_outstock_requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS external_jobwork_outstock_requests (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        worker_id INTEGER NOT NULL REFERENCES users(id),
        requested_by INTEGER NOT NULL REFERENCES users(id),
        company_id INTEGER NOT NULL REFERENCES companies(id),
        request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        request_notes TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created external_jobwork_outstock_requests table');

    // 2. Create external_jobwork_outstock_request_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS external_jobwork_outstock_request_items (
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL REFERENCES external_jobwork_outstock_requests(id) ON DELETE CASCADE,
        material_id INTEGER,
        material_name VARCHAR(255) NOT NULL,
        requested_quantity DECIMAL(10, 2) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        available_quantity DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created external_jobwork_outstock_request_items table');

    // 3. Create external_jobwork_outstock_transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS external_jobwork_outstock_transactions (
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL REFERENCES external_jobwork_outstock_requests(id),
        project_id INTEGER NOT NULL REFERENCES projects(id),
        worker_id INTEGER NOT NULL REFERENCES users(id),
        issued_by INTEGER NOT NULL REFERENCES users(id),
        company_id INTEGER NOT NULL REFERENCES companies(id),
        fulfillment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        qr_verification_status VARCHAR(50),
        qr_scan_time TIMESTAMP,
        transaction_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created external_jobwork_outstock_transactions table');

    // 4. Create external_jobwork_outstock_transaction_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS external_jobwork_outstock_transaction_items (
        id SERIAL PRIMARY KEY,
        transaction_id INTEGER NOT NULL REFERENCES external_jobwork_outstock_transactions(id) ON DELETE CASCADE,
        material_name VARCHAR(255) NOT NULL,
        issued_quantity DECIMAL(10, 2) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created external_jobwork_outstock_transaction_items table');

    // Create indexes
    console.log('🔧 Creating indexes...');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_external_request_project ON external_jobwork_outstock_requests(project_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_external_request_worker ON external_jobwork_outstock_requests(worker_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_external_request_status ON external_jobwork_outstock_requests(status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_external_request_company ON external_jobwork_outstock_requests(company_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_external_request_items ON external_jobwork_outstock_request_items(request_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_external_transaction_project ON external_jobwork_outstock_transactions(project_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_external_transaction_worker ON external_jobwork_outstock_transactions(worker_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_external_transaction_issued_by ON external_jobwork_outstock_transactions(issued_by)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_external_transaction_company ON external_jobwork_outstock_transactions(company_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_external_transaction_items ON external_jobwork_outstock_transaction_items(transaction_id)
    `);

    console.log('✅ All indexes created successfully');
    console.log('✅ External Job Work Outstock tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createExternalJobworkOutstockTables();
