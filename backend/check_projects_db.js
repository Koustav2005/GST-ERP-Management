const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const res = await pool.query("SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'projects'::regclass;");
  res.rows.forEach(r => console.log(`- ${r.conname}: ${r.pg_get_constraintdef}`));
  await pool.end();
}
check();
