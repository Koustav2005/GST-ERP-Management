const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function run() {
  try {
    await pool.query("ALTER TABLE purchase_orders ADD COLUMN po_number_sequential INTEGER;");
    console.log('Column added successfully');
  } catch (err) {
    console.log('Error:', err.message);
  }
  await pool.end();
}
run();
