const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'gst_management',
  password: 'admin123',
  port: 5433,
});

async function fix() {
  try {
    const res = await pool.query("UPDATE enquiries SET enquiry_number = 'EN0001' WHERE id = 9;");
    console.log('Update result:', res.rowCount);
    
    const check = await pool.query("SELECT id, enquiry_number FROM enquiries WHERE id = 9;");
    console.log('Current state:', JSON.stringify(check.rows));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

fix();
