const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const mo = await pool.query("SELECT id, company_id FROM major_orders WHERE company_id IS NULL;");
  const po = await pool.query("SELECT id, company_id FROM purchase_orders WHERE company_id IS NULL;");
  const rec = await pool.query("SELECT id, company_id FROM order_receipts WHERE company_id IS NULL;");
  
  console.log('MO NULLs:', mo.rows.length);
  console.log('PO NULLs:', po.rows.length);
  console.log('Receipt NULLs:', rec.rows.length);
  
  const allPos = await pool.query("SELECT id, company_id FROM purchase_orders;");
  console.log('All POs:', JSON.stringify(allPos.rows));
  
  await pool.end();
}
check();
