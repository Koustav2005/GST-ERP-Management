const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'gst_management',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 5432,
});

async function setupMaterialUsageTable() {
  const client = await pool.connect();
  try {
    console.log('Setting up material_usage_reports table...\n');

    // Create table
    await client.query(`
      CREATE TABLE IF NOT EXISTS material_usage_reports (
        id SERIAL PRIMARY KEY,
        project_id INTEGER,
        project_name VARCHAR(255),
        sent_by INTEGER NOT NULL,
        sent_by_name VARCHAR(255),
        accountant_id INTEGER NOT NULL,
        accountant_name VARCHAR(255),
        materials JSONB NOT NULL,
        notes TEXT,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (accountant_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_material_usage_accountant ON material_usage_reports(accountant_id);
      CREATE INDEX IF NOT EXISTS idx_material_usage_sent_by ON material_usage_reports(sent_by);
      CREATE INDEX IF NOT EXISTS idx_material_usage_project ON material_usage_reports(project_id);
      CREATE INDEX IF NOT EXISTS idx_material_usage_status ON material_usage_reports(status);
      CREATE INDEX IF NOT EXISTS idx_material_usage_created_at ON material_usage_reports(created_at DESC);
    `);

    console.log('✅ material_usage_reports table created successfully!');
    console.log('✅ Indexes created successfully!\n');
  } catch (error) {
    console.error('❌ Error setting up table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupMaterialUsageTable()
  .then(() => {
    console.log('Setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });




