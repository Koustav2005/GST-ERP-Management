const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function run() {
  try {
    await pool.query('BEGIN');
    
    // Re-sequence all purchase orders for Company 2
    await pool.query(`
      WITH numbered_pos AS (
        SELECT id, row_number() OVER (ORDER BY id) as new_seq
        FROM purchase_orders
        WHERE company_id = 2
      )
      UPDATE purchase_orders
      SET po_number_sequential = numbered_pos.new_seq
      FROM numbered_pos
      WHERE purchase_orders.id = numbered_pos.id;
    `);
    
    await pool.query('COMMIT');
    console.log('Re-sequencing successful for Shuhita');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.log('Error:', err.message);
  }
  await pool.end();
}
run();
