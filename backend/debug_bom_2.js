const pool = require('./config/database');
require('dotenv').config();

async function check() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'bill_of_materials'");
    console.log('Bill of Materials table exists:', res.rows.length > 0);
    
    if (res.rows.length === 0) {
      const allTables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
      console.log('All public tables:', allTables.rows.map(r => r.table_name).join(', '));
    } else {
        const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'bill_of_materials'");
        console.log('Columns:', cols.rows.map(r => r.column_name).join(', '));
    }

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();
