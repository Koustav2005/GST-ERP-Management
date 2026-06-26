const pool = require('./config/database');
require('dotenv').config();

async function check() {
  try {
    const r = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bill_of_materials' 
      ORDER BY ordinal_position
    `);
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();
