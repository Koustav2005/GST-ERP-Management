const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const p = await pool.query("SELECT * FROM projects WHERE po_number LIKE '%002%' OR name LIKE '%002%';");
  const mo = await pool.query("SELECT * FROM major_orders WHERE item_name LIKE '%002%';");
  const po = await pool.query("SELECT * FROM purchase_orders WHERE id = 2;");
  
  console.log('Projects:', JSON.stringify(p.rows));
  console.log('Major Orders:', JSON.stringify(mo.rows));
  console.log('Purchase Orders:', JSON.stringify(po.rows));
  
  await pool.end();
}
check();
