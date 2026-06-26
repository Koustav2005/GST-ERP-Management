const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const res = await pool.query("SELECT id, name, po_number FROM projects WHERE company_id = 2;");
  res.rows.forEach(r => console.log(`ID: ${r.id}, Name: ${r.name}, PO: ${r.po_number}`));
  await pool.end();
}
check();
