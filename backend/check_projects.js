const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const res = await pool.query("SELECT id, po_number, company_id FROM projects WHERE company_id = 2;");
  console.log('Projects:', JSON.stringify(res.rows));
  await pool.end();
}
check();
