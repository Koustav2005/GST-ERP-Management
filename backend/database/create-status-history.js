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
  console.log('Creating project_status_history table...');
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_status_history (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          old_status VARCHAR(50),
          new_status VARCHAR(50) NOT NULL,
          changed_by INTEGER REFERENCES users(id),
          changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          notes TEXT
      );
    `);
    console.log('✓ Table project_status_history created successfully');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_status_history_project_id ON project_status_history(project_id);
    `);
    console.log('✓ Index idx_status_history_project_id created successfully');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
