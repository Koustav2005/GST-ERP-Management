const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
  console.log('Tables:', res.rows.map(r => r.table_name).join(', '));
  await pool.end();
}
check();
