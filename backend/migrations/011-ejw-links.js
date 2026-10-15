// External Job Work v2 - link columns on existing tables (additive, idempotent).
// Run from backend/:  node migrations/011-ejw-links.js   (or npm run migrate:ejw-v2)
//
//  - the issue-to-floor tables (external_jobwork_outstock_*) get a nullable pointer to the inward item
//    the material comes from, so a request deducts from one place (ejw_inward_items.issued_qty) instead of
//    matching stock by company + material name. Old rows keep it NULL and are left alone.
//  - stock_item_requests can point at an inward item, so a Store request made while inwarding is filled
//    in on that item once Accounts creates or links the stock item.

const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE external_jobwork_outstock_request_items
        ADD COLUMN IF NOT EXISTS ejw_inward_item_id INTEGER REFERENCES ejw_inward_items(id) ON DELETE SET NULL;
    `);
    await client.query(`
      ALTER TABLE external_jobwork_outstock_transaction_items
        ADD COLUMN IF NOT EXISTS ejw_inward_item_id INTEGER REFERENCES ejw_inward_items(id) ON DELETE SET NULL;
    `);
    await client.query(`
      ALTER TABLE stock_item_requests
        ADD COLUMN IF NOT EXISTS ejw_inward_item_id INTEGER REFERENCES ejw_inward_items(id) ON DELETE SET NULL;
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_outstock_request_items_inward ON external_jobwork_outstock_request_items (ejw_inward_item_id) WHERE ejw_inward_item_id IS NOT NULL;`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_outstock_transaction_items_inward ON external_jobwork_outstock_transaction_items (ejw_inward_item_id) WHERE ejw_inward_item_id IS NOT NULL;`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_stock_item_requests_inward ON stock_item_requests (ejw_inward_item_id) WHERE ejw_inward_item_id IS NOT NULL;`);

    await client.query('COMMIT');
    console.log('External Job Work v2 (link columns) migration applied.');
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
