// External Job Work v2 - an inward item may wait for its stock item (additive, idempotent).
// Run from backend/:  node migrations/013-ejw-pending-stock-item.js   (or npm run migrate:ejw-v2)
//
// Store records customer material the moment it arrives, even when Accounts has not created its stock item yet:
// the item is saved with stock_item_id NULL and a stock item request linked to it (stock_item_requests.ejw_inward_item_id).
// When Accounts creates or links the stock item, it is filled in on the item. Such an item cannot go on a work order
// until it has one.

const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`ALTER TABLE ejw_inward_items ALTER COLUMN stock_item_id DROP NOT NULL;`);
    await client.query('COMMIT');
    console.log('External Job Work v2 (pending stock item) migration applied.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
