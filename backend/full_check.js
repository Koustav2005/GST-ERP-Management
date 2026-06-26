const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function run() {
  const res = await pool.query("SELECT id, company_id, po_number_sequential FROM purchase_orders ORDER BY id;");
  for (const row of res.rows) {
    console.log(`ID ${row.id} - Company ${row.company_id} - Seq ${row.po_number_sequential}`);
  }
  await pool.end();
}
run();
