// External Job Work v2 - document number series (additive, idempotent).
// Run from backend/:  node migrations/009-doc-sequences.js   (or npm run migrate:ejw-v2)
//
// One row per (company, series): DC (SE/DC/NNNN, shared by internal and external delivery challans),
// IN (SE/IN/NNNN), WO (SE/WO/NNNN), INV (SE/INV/YY-YY/NNN). Numbers are allocated inside the caller's
// transaction with a row lock, so a rolled-back document leaves no gap. reset_yearly restarts the
// counter each financial year (April); fy_label remembers which year the counter is in.
//
// Existing internal DCs are carried over: the DC counter starts at the highest SE/DC/NNNN already used.

const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS doc_sequences (
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        series VARCHAR(10) NOT NULL CHECK (series IN ('DC', 'IN', 'WO', 'INV')),
        last_value INTEGER NOT NULL DEFAULT 0 CHECK (last_value >= 0),
        reset_yearly BOOLEAN NOT NULL DEFAULT FALSE,
        fy_label VARCHAR(5),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (company_id, series)
      );
    `);

    // Carry over the numbers internal job work has already used.
    await client.query(`
      INSERT INTO doc_sequences (company_id, series, last_value)
      SELECT company_id, 'DC', MAX(substring(dc_number from '^SE/DC/([0-9]+)$')::int)
        FROM jobwork_dcs
       WHERE dc_number ~ '^SE/DC/[0-9]+$'
       GROUP BY company_id
      ON CONFLICT (company_id, series) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('External Job Work v2 (document sequences) migration applied.');
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
