// Internal Job Work v2 - Phase 2b schema (additive, idempotent).
// Run from backend/:  node migrations/002-job-work-v2-tax-split.js
//
//  - jobwork_returns: CGST / SGST / IGST split (computed server-side only), and
//    entry_type so a vendor invoice with no goods returned ("invoice_only", e.g. vendor B
//    after the material moved on to vendor C) lives in the same table as real returns.
//    One table keeps every vendor invoice - and the GST split Accounts needs - in one place.
//  - companies.state: our state, used for the CGST+SGST vs IGST decision and the e-way rule.

const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE jobwork_returns
        ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS entry_type VARCHAR(20) NOT NULL DEFAULT 'return';
    `);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobwork_returns_entry_type_check') THEN
          ALTER TABLE jobwork_returns
            ADD CONSTRAINT jobwork_returns_entry_type_check CHECK (entry_type IN ('return', 'invoice_only'));
        END IF;
      END $$;
    `);

    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS state VARCHAR(100);`);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobwork_dc_movements_to_vendor ON jobwork_dc_movements(to_vendor_id);`);

    await client.query('COMMIT');
    console.log('Internal Job Work v2 (Phase 2b) migration applied.');
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
