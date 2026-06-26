const pool = require('../config/database');

async function createProjectWorkersTable() {
  try {
    console.log('Creating project_workers table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_workers (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, worker_id)
      );
    `);
    console.log('project_workers table created successfully.');
  } catch (error) {
    console.error('Error creating project_workers table:', error);
  } finally {
    await pool.end();
  }
}

createProjectWorkersTable();
