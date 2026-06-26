const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const c = await pool.query("SELECT * FROM companies;");
  console.log('Companies:', JSON.stringify(c.rows));
  await pool.end();
}
check();
