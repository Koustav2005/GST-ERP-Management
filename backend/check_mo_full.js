const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const res = await pool.query("SELECT mo.id, mo.company_id, c.name as company_name, mo.item_name FROM major_orders mo JOIN companies c ON mo.company_id = c.id;");
  console.log('Major Orders:', JSON.stringify(res.rows));
  await pool.end();
}
check();
