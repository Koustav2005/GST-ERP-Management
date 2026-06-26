const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const mo = await pool.query("SELECT * FROM major_orders;");
  console.log('All Major Orders:', JSON.stringify(mo.rows));
  await pool.end();
}
check();
