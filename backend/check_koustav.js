const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const u = await pool.query("SELECT * FROM users WHERE id = 7;");
  console.log('User Koustav:', JSON.stringify(u.rows));
  await pool.end();
}
check();
