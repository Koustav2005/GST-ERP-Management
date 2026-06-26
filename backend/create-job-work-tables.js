const pool = require('./config/database');

async function createJobWorkTables() {
  try {
    console.log('📦 Creating Job Work tables...\n');

    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS job_work_requests (
        id SERIAL PRIMARY KEY,
        job_id VARCHAR(50) UNIQUE NOT NULL,
        project_id INT REFERENCES projects(id) ON DELETE CASCADE,
        company_id INT REFERENCES companies(id) ON DELETE CASCADE,
        job_work_type VARCHAR(100) NOT NULL,
        purpose TEXT,
        loaded_vehicle_weight NUMERIC(10,2) NOT NULL,
        unloaded_vehicle_weight NUMERIC(10,2) NOT NULL,
        actual_vehicle_weight NUMERIC(10,2) NOT NULL,
        vehicle_no VARCHAR(50),
        store_incharge_id INT REFERENCES users(id) ON DELETE CASCADE,
        accountant_id INT REFERENCES users(id) ON DELETE CASCADE,
        created_by INT REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        challan_file_path TEXT,
        challan_file_name TEXT,
        vendor_email VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Pending Store Incharge'
      );

      CREATE TABLE IF NOT EXISTS job_work_items (
        id SERIAL PRIMARY KEY,
        job_work_id INT REFERENCES job_work_requests(id) ON DELETE CASCADE,
        material_name VARCHAR(255) NOT NULL,
        hsn VARCHAR(50),
        quantity NUMERIC(10,2) NOT NULL,
        unit VARCHAR(50) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS job_work_images (
        id SERIAL PRIMARY KEY,
        job_work_id INT REFERENCES job_work_requests(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        file_name VARCHAR(255) NOT NULL
      );
    `);

    console.log('✅ Job Work tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating Job Work tables:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createJobWorkTables();
