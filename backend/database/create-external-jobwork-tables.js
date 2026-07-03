const pool = require('../config/database');

async function createExternalJobworkTables() {
  try {
    console.log('Creating external jobwork tables...');

    // Create external_jobwork_outstock_requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS external_jobwork_outstock_requests (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        requested_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        request_notes TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created external_jobwork_outstock_requests table');

    // Create external_jobwork_outstock_request_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS external_jobwork_outstock_request_items (
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL REFERENCES external_jobwork_outstock_requests(id) ON DELETE CASCADE,
        material_name VARCHAR(255) NOT NULL,
        requested_quantity DECIMAL(10, 2) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        available_quantity DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created external_jobwork_outstock_request_items table');

    // Create external_material_collections table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS external_material_collections (
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL REFERENCES external_jobwork_outstock_requests(id) ON DELETE CASCADE,
        collected_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        collection_timestamp TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created external_material_collections table');

    // Create external_jobwork_inventory table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS external_jobwork_inventory (
        id SERIAL PRIMARY KEY,
        challan_id INTEGER,
        job_work_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        material_name VARCHAR(255) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        quantity DECIMAL(10, 2) NOT NULL,
        received_quantity DECIMAL(10, 2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        hsn_code VARCHAR(50),
        gst_rate DECIMAL(5, 2),
        batch_lot_number VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created external_jobwork_inventory table');

    // Create external_jobwork_material_notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS external_jobwork_material_notifications (
        id SERIAL PRIMARY KEY,
        job_work_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        npd_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        material_description TEXT NOT NULL,
        expected_arrival_date DATE,
        material_details JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Created external_jobwork_material_notifications table');

    console.log('✅ All external jobwork tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createExternalJobworkTables();
