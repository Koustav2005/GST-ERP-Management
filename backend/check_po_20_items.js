const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const items = await pool.query("SELECT po_id, name FROM purchase_order_items WHERE po_id = 20;");
  console.log('PO 20 Items:', JSON.stringify(items.rows));
  await pool.end();
}
check();
