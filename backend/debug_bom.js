const pool = require('./config/database');
require('dotenv').config();

async function check() {
  try {
    console.log('--- TABLES ---');
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log(tables.rows.map(r => r.table_name));

    console.log('--- bill_of_materials COLUMNS ---');
    const cols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bill_of_materials' 
      ORDER BY ordinal_position
    `);
    console.log(cols.rows);

    process.exit(0);
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}
check();
