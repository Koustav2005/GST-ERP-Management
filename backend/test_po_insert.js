const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function test() {
  const company_id = 2; // Shuhita
  const master_vendor_id = 2; // Raghu (exists in users but maybe not master_vendors?)
  // Wait! I fixed vendors list. Let's check a valid master_vendor_id for Company 2.
  const mv = await pool.query("SELECT id FROM master_vendors WHERE company_id = 2 LIMIT 1;");
  if (mv.rows.length === 0) {
    console.log('No master vendor for Company 2. Cannot test.');
    await pool.end();
    return;
  }
  const real_mv_id = mv.rows[0].id;
  
  try {
    const res = await pool.query(`
      INSERT INTO purchase_orders 
      (company_id, master_vendor_id, vendor_name, vendor_email, total_amount, created_by, status, po_number_sequential) 
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7) 
      RETURNING *`,
      [company_id, real_mv_id, 'Test Vendor', 'test@example.com', 100, 7, 1]
    );
    console.log('Success:', res.rows[0]);
  } catch (err) {
    console.log('ERROR:', err.message);
  }
  await pool.end();
}
test();
