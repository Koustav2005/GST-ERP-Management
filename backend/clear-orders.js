const pool = require('./config/database');

async function clearOrders() {
    try {
        console.log('Starting deletion of all order records...');

        // 1. Delete order receipt items
        await pool.query('DELETE FROM order_receipt_items');
        console.log('Deleted order_receipt_items');

        // 2. Delete order receipts
        await pool.query('DELETE FROM order_receipts');
        console.log('Deleted order_receipts');

        // 3. Delete PO items
        await pool.query('DELETE FROM purchase_order_items');
        console.log('Deleted purchase_order_items');

        // 4. Delete POs
        await pool.query('DELETE FROM purchase_orders');
        console.log('Deleted purchase_orders');

        // 5. Delete legacy major orders
        await pool.query('DELETE FROM major_orders');
        console.log('Deleted major_orders');

        // 6. Delete minor order bids
        await pool.query('DELETE FROM minor_order_bids');
        console.log('Deleted minor_order_bids');

        // 7. Delete minor orders
        await pool.query('DELETE FROM minor_orders');
        console.log('Deleted minor_orders');

        console.log('\n✅ Successfully removed all order records from the database.');
        process.exit(0);
    } catch (err) {
        console.error('Error clearing order records:', err);
        process.exit(1);
    }
}

clearOrders();
