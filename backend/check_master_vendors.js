const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const res = await pool.query("SELECT * FROM master_vendors;");
  res.rows.forEach(r => console.log(`ID: ${r.id}, Name: ${r.name}, Company: ${r.company_id}`));
  await pool.end();
}
check();
