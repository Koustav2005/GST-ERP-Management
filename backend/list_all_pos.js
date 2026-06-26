const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const res = await pool.query("SELECT id, company_id, vendor_name FROM purchase_orders;");
  res.rows.forEach(r => console.log(`ID: ${r.id}, Company: ${r.company_id}, Vendor: ${r.vendor_name}`));
  await pool.end();
}
check();
