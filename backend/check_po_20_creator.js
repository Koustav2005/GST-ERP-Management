const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const po = await pool.query("SELECT po.id, po.company_id, po.created_by, u.name as creator_name FROM purchase_orders po JOIN users u ON po.created_by = u.id WHERE po.id = 20;");
  console.log('PO 20 Creator:', JSON.stringify(po.rows));
  await pool.end();
}
check();
