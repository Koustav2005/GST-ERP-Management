const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function test() {
  const company_id = 2; // Shuhita
  const master_vendor_id = 2; // Mansa
  try {
    await pool.query('BEGIN');
    const seqResult = await pool.query(
      'SELECT COALESCE(MAX(po_number_sequential), 0) + 1 as next_seq FROM purchase_orders WHERE company_id = $1',
      [company_id]
    );
    const nextSeq = seqResult.rows[0].next_seq;
    console.log('Next Seq:', nextSeq);
    
    const poResult = await pool.query(
      `INSERT INTO purchase_orders 
      (company_id, master_vendor_id, vendor_name, vendor_email, total_amount, created_by, status, po_number_sequential) 
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7) 
      RETURNING *`,
      [company_id, master_vendor_id, 'Mansa', 'mansa@example.com', 500, 7, nextSeq]
    );
    console.log('PO Created:', poResult.rows[0].id);
    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.log('ERROR:', err.message);
  }
  await pool.end();
}
test();
