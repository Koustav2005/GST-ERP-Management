const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const v = await pool.query("SELECT * FROM users WHERE name = 'Raghu';");
  console.log('Vendor Raghu:', JSON.stringify(v.rows));
  await pool.end();
}
check();
