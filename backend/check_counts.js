const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function run() {
  const res = await pool.query("SELECT po_id, count(*) FROM purchase_order_items GROUP BY po_id;");
  console.log('PO Item Counts:', JSON.stringify(res.rows));
  await pool.end();
}
run();
