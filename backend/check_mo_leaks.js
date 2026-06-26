const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const companyId = 2; // Shuhita
  const result = await pool.query(`
      (SELECT 
        mo.id, mo.company_id, mo.item_name, 'legacy' as type
      FROM major_orders mo
      WHERE mo.company_id = $1)
      UNION ALL
      (SELECT 
        poi.id, po.company_id, poi.material_name as item_name, 'po' as type
      FROM purchase_order_items poi
      JOIN purchase_orders po ON poi.po_id = po.id
      WHERE po.company_id = $1)
      `, [companyId]);
  
  const leaks = result.rows.filter(r => r.company_id != 2);
  console.log('Total items for Company 2:', result.rows.length);
  console.log('Leaks (items with company_id != 2):', JSON.stringify(leaks));
  await pool.end();
}
check();
