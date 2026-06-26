const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const po = await pool.query("SELECT * FROM purchase_orders WHERE id = 2;");
  const mo = await pool.query("SELECT * FROM major_orders WHERE id = 2;");
  console.log('PO 2:', JSON.stringify(po.rows));
  console.log('MO 2:', JSON.stringify(mo.rows));
  await pool.end();
}
check();
