const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/GST-SVCEE/gst-management-app/backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function run() {
  console.log('Creating project_internal_reports table...');
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_internal_reports (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          phase_name VARCHAR(50) NOT NULL,
          report_index INTEGER NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          file_path VARCHAR(255) NOT NULL,
          uploaded_by INTEGER REFERENCES users(id),
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_project_phase_report UNIQUE (project_id, phase_name, report_index)
      );
    `);
    console.log('✓ Table project_internal_reports created successfully');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
