const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'master_vendors';");
  console.log('Columns:', JSON.stringify(res.rows.map(r => r.column_name)));
  await pool.end();
}
check();
