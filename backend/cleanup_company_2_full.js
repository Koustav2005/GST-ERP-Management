const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: 'localhost', database: 'gst_management', password: 'admin123', port: 5433,
});
async function cleanup() {
  const companyId = 2; // Shuhita Engineering
  try {
    await pool.query('BEGIN');
    
    // 1. Delete order receipts items for company 2
    await pool.query(`
      DELETE FROM order_receipt_items 
      WHERE receipt_id IN (SELECT id FROM order_receipts WHERE company_id = $1)
    `, [companyId]);
    
    // 2. Delete order receipts for company 2
    await pool.query('DELETE FROM order_receipts WHERE company_id = $1', [companyId]);
    
    // 3. Delete purchase order items for company 2
    await pool.query(`
      DELETE FROM purchase_order_items 
      WHERE po_id IN (SELECT id FROM purchase_orders WHERE company_id = $1)
    `, [companyId]);
    
    // 4. Delete purchase orders for company 2
    await pool.query('DELETE FROM purchase_orders WHERE company_id = $1', [companyId]);
    
    // 5. Delete major orders for company 2 (legacy)
    await pool.query('DELETE FROM major_orders WHERE company_id = $1', [companyId]);
    
    await pool.query('COMMIT');
    console.log('Successfully emptied orders and receipts for Company 2 (Shuhita Engineering)');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error during cleanup:', err.message);
  } finally {
    await pool.end();
  }
}
cleanup();
