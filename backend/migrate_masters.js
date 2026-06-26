const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function migrate() {
  try {
    console.log('Adding company_id to master_vendors...');
    await pool.query("ALTER TABLE master_vendors ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);");
    
    console.log('Adding company_id to master_materials...');
    await pool.query("ALTER TABLE master_materials ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);");
    
    // Set default company_id to 1 for existing shared records if any
    console.log('Linking existing shared records to company 1...');
    await pool.query("UPDATE master_vendors SET company_id = 1 WHERE company_id IS NULL;");
    await pool.query("UPDATE master_materials SET company_id = 1 WHERE company_id IS NULL;");
    
    console.log('Success!');
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await pool.end();
  }
}
migrate();
