// Internal Job Work v2 - the PM no longer enters vehicle weights (Store records them on the DC).
// Run from backend/:  node migrations/005-job-work-weights-optional.js   (or npm run migrate:jobwork-v2)
//
// Drops NOT NULL on the three weight columns of job_work_requests so a request can be saved without
// them. Nothing is dropped or rewritten; existing rows keep their values. Idempotent.

const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE job_work_requests
        ALTER COLUMN loaded_vehicle_weight DROP NOT NULL,
        ALTER COLUMN unloaded_vehicle_weight DROP NOT NULL,
        ALTER COLUMN actual_vehicle_weight DROP NOT NULL;
    `);
    await client.query('COMMIT');
    console.log('Internal Job Work v2 (optional vehicle weights) migration applied.');
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
