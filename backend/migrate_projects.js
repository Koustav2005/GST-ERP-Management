const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function migrate() {
  try {
    console.log('Dropping old projects unique constraint...');
    await pool.query("ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_po_number_key;");
    console.log('Adding composite unique constraint...');
    await pool.query("ALTER TABLE projects ADD CONSTRAINT projects_company_po_number_unique UNIQUE (company_id, po_number);");
    console.log('Success!');
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}
migrate();
