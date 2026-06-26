const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const res = await pool.query("SELECT * FROM companies;");
  console.log('Companies:', JSON.stringify(res.rows));
  await pool.end();
}
check();
