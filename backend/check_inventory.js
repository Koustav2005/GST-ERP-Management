const pool = require('./config/database');
require('dotenv').config();

async function check() {
  try {
    const r = await pool.query("SELECT item_name FROM inventory WHERE item_name ILIKE '%ms sheet%' OR item_name ILIKE '%sheet%'");
    console.log('Matching items in inventory:', r.rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
check();
