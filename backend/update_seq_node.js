const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function run() {
  try {
    await pool.query(`
      WITH numbered_pos AS (
        SELECT id, row_number() OVER (PARTITION BY company_id ORDER BY id) as seq
        FROM purchase_orders
      )
      UPDATE purchase_orders
      SET po_number_sequential = numbered_pos.seq
      FROM numbered_pos
      WHERE purchase_orders.id = numbered_pos.id;
    `);
    console.log('Update successful');
  } catch (err) {
    console.log('Error:', err.message);
  }
  await pool.end();
}
run();
