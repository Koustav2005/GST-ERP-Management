// Internal Job Work v2 - two kinds of job work item (additive, idempotent).
// Run from backend/:  node migrations/006-job-work-item-kind.js   (or npm run migrate:jobwork-v2)
//
//  'stock'   : material that is (or will be) a registered stock item - the earlier flow.
//  'product' : the product being developed in the project itself, sent out for a process. It has no
//              stock item yet, so it is listed for the accountant to add to stock.
// job_work_items.item_kind says which; stock_item_requests.source says where a request came from, so
// the accountant can filter the list.

const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE job_work_items
        ADD COLUMN IF NOT EXISTS item_kind VARCHAR(20) NOT NULL DEFAULT 'stock';
    `);
    await client.query(`
      ALTER TABLE stock_item_requests
        ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'stock';
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_work_items_item_kind_check') THEN
          ALTER TABLE job_work_items ADD CONSTRAINT job_work_items_item_kind_check CHECK (item_kind IN ('stock', 'product'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_item_requests_source_check') THEN
          ALTER TABLE stock_item_requests ADD CONSTRAINT stock_item_requests_source_check CHECK (source IN ('stock', 'product'));
        END IF;
      END $$;
    `);
    await client.query('COMMIT');
    console.log('Internal Job Work v2 (item kind) migration applied.');
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
