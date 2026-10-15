// Internal Job Work v2 - an identifier for the product being developed (additive, idempotent).
// Run from backend/:  node migrations/007-job-work-item-code.js   (or npm run migrate:jobwork-v2)
//
// A product under development has no HSN, so the PM gives it a drawing / part number instead (or the
// system generates a reference). It is carried to the accountant's "add to stock" list and to Store.

const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`ALTER TABLE job_work_items ADD COLUMN IF NOT EXISTS item_code VARCHAR(100);`);
    await client.query('COMMIT');
    console.log('Internal Job Work v2 (item code) migration applied.');
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
