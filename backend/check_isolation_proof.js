const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function check() {
  const companyId = 1; // SVCE
  const result = await pool.query(`
      (SELECT 
        mo.id, mo.company_id, mo.item_name
      FROM major_orders mo
      WHERE mo.company_id = $1)
      UNION ALL
      (SELECT 
        poi.id, po.company_id, poi.material_name as item_name
      FROM purchase_order_items poi
      JOIN purchase_orders po ON poi.po_id = po.id
      WHERE po.company_id = $1)
      `, [companyId]);
  
  const ids = result.rows.map(r => r.id);
  console.log('Items for Company 1:', JSON.stringify(result.rows));
  console.log('Does Company 1 see item from PO 20?', ids.includes(20)); // Note: ID 20 is the ITEM ID for Cassette in PO 20
  await pool.end();
}
check();
