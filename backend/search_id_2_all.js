const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const tables = ['projects', 'major_orders', 'purchase_orders', 'purchase_order_items', 'order_receipts', 'enquiries'];
  for (const t of tables) {
    const res = await pool.query(`SELECT id FROM ${t} WHERE id = 2;`);
    if (res.rows.length > 0) {
      console.log(`Table ${t} HAS ID 2`);
    }
  }
  await pool.end();
}
check();
