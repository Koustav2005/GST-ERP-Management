// External Job Work v2 - printed documents (additive, idempotent).
// Run from backend/:  node migrations/014-ejw-print.js   (or npm run migrate:ejw-v2)
//
//  companies.address                 printed at the top of every delivery challan and tax invoice
//  ejw_dispatches.place_of_supply_*  the state (name + GST code) the supply is made to, taken from the customer's GSTIN on issue
//  ejw_dispatches.process_text       "Job work - return after <process>" on the delivery challan

const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS address TEXT;`);
    await client.query(`ALTER TABLE ejw_dispatches ADD COLUMN IF NOT EXISTS place_of_supply_state VARCHAR(100);`);
    await client.query(`ALTER TABLE ejw_dispatches ADD COLUMN IF NOT EXISTS place_of_supply_code VARCHAR(2);`);
    await client.query(`ALTER TABLE ejw_dispatches ADD COLUMN IF NOT EXISTS process_text VARCHAR(255);`);
    await client.query('COMMIT');
    console.log('External Job Work v2 (print) migration applied.');
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
