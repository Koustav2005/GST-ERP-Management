// External Job Work v2 - fixes after Phase 1 review (additive, idempotent).
// Run from backend/:  node migrations/012-ejw-receipts-numbering.js   (or npm run migrate:ejw-v2)
//
//  1. Customer DC uniqueness: one customer DC may arrive in several trucks, and a customer can reuse a DC
//     number later. The hard unique on (customer, dc_no) becomes unique on (company, customer, dc_no, dc_date);
//     the API warns (does not block) when the same number was used by that customer in the last 365 days.
//  2. Receipts: ejw_inward_receipts holds each truck (its own received date, vehicle, e-way bill) against one
//     inward; every inward item belongs to a receipt. Existing inwards get a receipt 1 from their own columns.
//  3. Manual numbers (from Tally): doc_sequences.number_source ('app' | 'manual', DC and INV only), and
//     ejw_dispatches.invoice_fy so an invoice number is unique within a financial year, not for ever
//     (Tally restarts at 001 each year).

const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ---- 1. customer DC uniqueness ------------------------------------------------------------
    await client.query(`DROP INDEX IF EXISTS uq_ejw_inwards_customer_dc;`);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ejw_inwards_customer_dc_date
        ON ejw_inwards (company_id, customer_id, LOWER(BTRIM(customer_dc_no)), COALESCE(customer_dc_date, DATE '0001-01-01'))
        WHERE NULLIF(BTRIM(customer_dc_no), '') IS NOT NULL;
    `);

    // ---- 2. receipts ----------------------------------------------------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS ejw_inward_receipts (
        id SERIAL PRIMARY KEY,
        inward_id INTEGER NOT NULL REFERENCES ejw_inwards(id) ON DELETE CASCADE,
        receipt_no INTEGER NOT NULL CHECK (receipt_no > 0),
        received_date DATE NOT NULL DEFAULT CURRENT_DATE,
        vehicle_no VARCHAR(50),
        eway_bill_no VARCHAR(12),
        notes TEXT,
        received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (inward_id, receipt_no),
        CHECK (eway_bill_no IS NULL OR eway_bill_no ~ '^[0-9]{12}$')
      );
    `);
    await client.query(`ALTER TABLE ejw_inward_items ADD COLUMN IF NOT EXISTS receipt_id INTEGER REFERENCES ejw_inward_receipts(id);`);
    await client.query(`ALTER TABLE ejw_inward_documents ADD COLUMN IF NOT EXISTS receipt_id INTEGER REFERENCES ejw_inward_receipts(id) ON DELETE SET NULL;`);
    // inwards created before receipts existed: their own columns become receipt 1
    await client.query(`
      INSERT INTO ejw_inward_receipts (inward_id, receipt_no, received_date, vehicle_no, eway_bill_no, received_by, created_at)
      SELECT i.id, 1, i.received_date, i.vehicle_no, i.eway_bill_no, i.received_by, i.created_at
        FROM ejw_inwards i
       WHERE NOT EXISTS (SELECT 1 FROM ejw_inward_receipts r WHERE r.inward_id = i.id);
    `);
    await client.query(`
      UPDATE ejw_inward_items it SET receipt_id = r.id
        FROM ejw_inward_receipts r
       WHERE r.inward_id = it.inward_id AND r.receipt_no = 1 AND it.receipt_id IS NULL;
    `);
    await client.query(`ALTER TABLE ejw_inward_items ALTER COLUMN receipt_id SET NOT NULL;`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ejw_inward_items_receipt ON ejw_inward_items (receipt_id);`);

    // ---- 3. number source + invoice uniqueness per financial year -----------------------------------
    await client.query(`ALTER TABLE ejw_dispatches ADD COLUMN IF NOT EXISTS invoice_fy VARCHAR(4);`);
    await client.query(`ALTER TABLE doc_sequences ADD COLUMN IF NOT EXISTS number_source VARCHAR(10) NOT NULL DEFAULT 'app';`);
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'doc_sequences_number_source_check') THEN
          ALTER TABLE doc_sequences ADD CONSTRAINT doc_sequences_number_source_check
            CHECK (number_source IN ('app', 'manual') AND (number_source = 'app' OR series IN ('DC', 'INV')));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ejw_dispatches_invoice_fy_check') THEN
          ALTER TABLE ejw_dispatches ADD CONSTRAINT ejw_dispatches_invoice_fy_check
            CHECK (invoice_no IS NULL OR invoice_fy IS NOT NULL);
        END IF;
      END $$;
    `);
    await client.query(`DROP INDEX IF EXISTS uq_ejw_dispatches_invoice_no;`);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ejw_dispatches_invoice_no_fy
        ON ejw_dispatches (company_id, invoice_fy, invoice_no) WHERE invoice_no IS NOT NULL;
    `);

    await client.query('COMMIT');
    console.log('External Job Work v2 (receipts and numbering fixes) migration applied.');
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
