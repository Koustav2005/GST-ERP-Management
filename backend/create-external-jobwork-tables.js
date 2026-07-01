const pool = require('./config/database');

async function createExternalJobworkTables() {
  const client = await pool.connect();

  try {
    console.log('Creating external job work material notification table...');
    
    // Table for NPD to notify about incoming materials
    await client.query(`
      CREATE TABLE IF NOT EXISTS external_jobwork_material_notifications (
        id SERIAL PRIMARY KEY,
        job_work_id INT,
        npd_user_id INT NOT NULL REFERENCES users(id),
        accountant_id INT REFERENCES users(id),
        company_id INT NOT NULL REFERENCES companies(id),
        material_description TEXT NOT NULL,
        expected_arrival_date DATE,
        material_details JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ external_jobwork_material_notifications table created');

    // Table for Accountant to create challans for external job work materials
    await client.query(`
      CREATE TABLE IF NOT EXISTS external_jobwork_challans (
        id SERIAL PRIMARY KEY,
        notification_id INT NOT NULL REFERENCES external_jobwork_material_notifications(id) ON DELETE CASCADE,
        job_work_id INT,
        company_id INT NOT NULL REFERENCES companies(id),
        accountant_id INT NOT NULL REFERENCES users(id),
        store_incharge_id INT NOT NULL REFERENCES users(id),
        challan_number VARCHAR(100) UNIQUE NOT NULL,
        material_description TEXT NOT NULL,
        quantity DECIMAL(10,2),
        unit VARCHAR(50),
        expected_arrival_date DATE,
        notes TEXT,
        challan_status VARCHAR(50) DEFAULT 'pending',
        received_at TIMESTAMP,
        received_by INT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ external_jobwork_challans table created');

    // Separate inventory table for external job work materials
    await client.query(`
      CREATE TABLE IF NOT EXISTS external_jobwork_inventory (
        id SERIAL PRIMARY KEY,
        challan_id INT NOT NULL REFERENCES external_jobwork_challans(id) ON DELETE CASCADE,
        job_work_id INT,
        company_id INT NOT NULL REFERENCES companies(id),
        material_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        unit VARCHAR(50) NOT NULL,
        hsn_code VARCHAR(50),
        gst_rate DECIMAL(5,2),
        received_quantity DECIMAL(10,2),
        received_date TIMESTAMP,
        received_by INT REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(challan_id, material_name)
      );
    `);
    console.log('✓ external_jobwork_inventory table created');

    // Create indexes for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ext_notif_company ON external_jobwork_material_notifications(company_id);
      CREATE INDEX IF NOT EXISTS idx_ext_notif_job_work ON external_jobwork_material_notifications(job_work_id);
      CREATE INDEX IF NOT EXISTS idx_ext_notif_accountant ON external_jobwork_material_notifications(accountant_id);
      CREATE INDEX IF NOT EXISTS idx_ext_challan_company ON external_jobwork_challans(company_id);
      CREATE INDEX IF NOT EXISTS idx_ext_challan_job_work ON external_jobwork_challans(job_work_id);
      CREATE INDEX IF NOT EXISTS idx_ext_challan_status ON external_jobwork_challans(challan_status);
      CREATE INDEX IF NOT EXISTS idx_ext_inventory_company ON external_jobwork_inventory(company_id);
      CREATE INDEX IF NOT EXISTS idx_ext_inventory_job_work ON external_jobwork_inventory(job_work_id);
    `);
    console.log('✓ Indexes created for external job work tables');

    console.log('\n✅ All external job work tables created successfully!');

  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

createExternalJobworkTables()
  .then(() => {
    console.log('\nDatabase migration completed!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
