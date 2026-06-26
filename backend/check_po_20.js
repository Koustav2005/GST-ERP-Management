const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const po = await pool.query("SELECT * FROM purchase_orders WHERE id = 20;");
  console.log('PO 20:', JSON.stringify(po.rows));
  await pool.end();
}
check();
