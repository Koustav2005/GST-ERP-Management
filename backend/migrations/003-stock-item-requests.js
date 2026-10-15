// Internal Job Work v2 - Phase 4 schema (additive, idempotent).
// Run from backend/:  node migrations/003-stock-item-requests.js   (or npm run migrate:jobwork-v2)
//
//  - stock_item_requests: Store / PM ask the accountant for a stock item, with the context the
//    accountant needs to decide (stored as a snapshot so it survives later edits).
//  - notifications.data: structured payload (request_id, dc_id, ...) so the app never has to
//    parse the message text.

const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_item_requests (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        requested_name VARCHAR(255) NOT NULL,
        requested_hsn VARCHAR(50),
        requested_unit VARCHAR(50),
        note TEXT,
        requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        requester_role VARCHAR(50),
        job_work_item_id INTEGER REFERENCES job_work_items(id) ON DELETE SET NULL,
        dc_id INTEGER REFERENCES jobwork_dcs(id) ON DELETE SET NULL,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        context JSONB NOT NULL DEFAULT '{}'::jsonb,
        status VARCHAR(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'created', 'linked', 'rejected')),
        stock_item_id INTEGER REFERENCES stock_items(id) ON DELETE SET NULL,
        reason TEXT,
        resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // At most one pending request per name (case-insensitive) in a company.
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_item_requests_pending_name
        ON stock_item_requests (company_id, LOWER(requested_name)) WHERE status = 'pending';
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_stock_item_requests_company_status ON stock_item_requests (company_id, status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_stock_item_requests_item ON stock_item_requests (job_work_item_id);`);

    await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB;`);

    await client.query('COMMIT');
    console.log('Internal Job Work v2 (Phase 4) migration applied.');
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
