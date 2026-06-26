const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const po = await pool.query("SELECT * FROM purchase_orders;");
  const items = await pool.query("SELECT * FROM purchase_order_items;");
  console.log('Purchase Orders:', JSON.stringify(po.rows));
  console.log('PO Items:', JSON.stringify(items.rows));
  await pool.end();
}
check();
