const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const result = await pool.query(`
      (SELECT 
        mo.id, mo.company_id, 'legacy' as type
      FROM major_orders mo)
      UNION ALL
      (SELECT 
        poi.id, po.company_id, 'po' as type
      FROM purchase_order_items poi
      JOIN purchase_orders po ON poi.po_id = po.id)
  `);
  console.log('Results:', JSON.stringify(result.rows));
  await pool.end();
}
check();
