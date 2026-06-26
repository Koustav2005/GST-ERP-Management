const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function run() {
  try {
    await pool.query("UPDATE purchase_orders SET po_number_sequential = 1 WHERE id = 21");
    await pool.query("UPDATE purchase_orders SET po_number_sequential = 2 WHERE id = 25");
    console.log('Update successful');
    const res = await pool.query("SELECT id, po_number_sequential FROM purchase_orders WHERE company_id = 2;");
    console.log('New values:', JSON.stringify(res.rows));
  } catch (err) {
    console.log('Error:', err.message);
  }
  await pool.end();
}
run();
