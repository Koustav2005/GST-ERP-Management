const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function fix() {
  await pool.query("UPDATE projects SET po_number = 'POEN00010001', name = 'POEN00010001' WHERE id = 3;");
  console.log('Update done');
  const res = await pool.query("SELECT id, name, po_number FROM projects WHERE id = 3;");
  console.log('Verified:', JSON.stringify(res.rows));
  await pool.end();
}
fix();
