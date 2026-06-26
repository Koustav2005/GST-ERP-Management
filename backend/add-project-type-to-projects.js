const pool = require('./config/database');

async function addProjectTypeToProjects() {
  try {
    console.log('Adding project_type column to projects table...');

    await pool.query(`
      ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS project_type VARCHAR(50) DEFAULT 'regular'
    `);

    await pool.query(`
      UPDATE projects
      SET project_type = 'regular'
      WHERE project_type IS NULL
    `);

    console.log('Project type column is ready.');
  } catch (error) {
    console.error('Error adding project_type column:', error);
  } finally {
    await pool.end();
  }
}

addProjectTypeToProjects();
