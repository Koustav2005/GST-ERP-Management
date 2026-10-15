// Internal Job Work v2 - Phase 1 schema (additive, idempotent).
// Spec: .kiro/specs/internal-job-work-v2/requirements.md
// Run from backend/:  node migrations/001-internal-job-work-v2.js
//
// Only CREATE ... IF NOT EXISTS and ADD COLUMN IF NOT EXISTS. Nothing is dropped
// or rewritten, so /job-work/submit and the old challan upload keep working.

const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ---- Masters ---------------------------------------------------------

    await client.query(`
      CREATE TABLE IF NOT EXISTS gst_rates (
        id SERIAL PRIMARY KEY,
        rate NUMERIC(5, 2) NOT NULL UNIQUE,
        label VARCHAR(50) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      INSERT INTO gst_rates (rate, label) VALUES
        (5, 'GST 5%'),
        (18, 'GST 18%'),
        (40, 'GST 40%')
      ON CONFLICT (rate) DO NOTHING;
    `);

    // Stock item master. Only the accountant creates rows (enforced in the API).
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_items (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        hsn VARCHAR(50),
        unit VARCHAR(50) NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_stock_items_company_lower_name ON stock_items(company_id, LOWER(name));`);

    // ---- Link existing request items to the stock master -------------------
    // Additive only. Nullable so old rows and /job-work/submit are unaffected;
    // the DC-creation API will refuse items where stock_item_id is NULL.

    await client.query(`
      ALTER TABLE job_work_items
        ADD COLUMN IF NOT EXISTS stock_item_id INTEGER REFERENCES stock_items(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS unit_value NUMERIC(14, 2);
    `);

    // ---- Delivery challan ---------------------------------------------------
    // One DC = one vendor. Request items link through jobwork_dc_items.

    await client.query(`
      CREATE TABLE IF NOT EXISTS jobwork_dcs (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        dc_number VARCHAR(50) NOT NULL,
        dc_date DATE NOT NULL DEFAULT CURRENT_DATE,
        vendor_id INTEGER NOT NULL REFERENCES master_vendors(id),
        vendor_name VARCHAR(255) NOT NULL,
        vendor_gstin VARCHAR(100),
        vendor_address TEXT,
        process VARCHAR(255),
        vehicle_number VARCHAR(50),
        loaded_vehicle_weight NUMERIC(10, 2),
        unloaded_vehicle_weight NUMERIC(10, 2),
        eway_bill_no VARCHAR(50),
        current_location_vendor_id INTEGER REFERENCES master_vendors(id),
        status VARCHAR(30) NOT NULL DEFAULT 'dc_created'
          CHECK (status IN ('dc_created', 'approved', 'rejected', 'dispatched', 'partially_returned', 'closed')),
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        approved_at TIMESTAMP,
        rejection_reason TEXT,
        dispatched_at TIMESTAMP,
        closed_at TIMESTAMP,
        attachment_path TEXT,
        attachment_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (company_id, dc_number)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobwork_dcs_company_status ON jobwork_dcs(company_id, status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobwork_dcs_vendor ON jobwork_dcs(vendor_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobwork_dcs_current_location ON jobwork_dcs(current_location_vendor_id);`);

    // job_work_item_id is UNIQUE: a request item goes on only one DC, full quantity.
    await client.query(`
      CREATE TABLE IF NOT EXISTS jobwork_dc_items (
        id SERIAL PRIMARY KEY,
        dc_id INTEGER NOT NULL REFERENCES jobwork_dcs(id) ON DELETE CASCADE,
        job_work_item_id INTEGER NOT NULL UNIQUE REFERENCES job_work_items(id),
        stock_item_id INTEGER NOT NULL REFERENCES stock_items(id),
        description VARCHAR(255),
        hsn_code VARCHAR(50),
        quantity NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
        unit VARCHAR(50) NOT NULL,
        unit_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
        total_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
        returned_quantity NUMERIC(12, 3) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CHECK (returned_quantity >= 0 AND returned_quantity <= quantity)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobwork_dc_items_dc ON jobwork_dc_items(dc_id);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS jobwork_dc_movements (
        id SERIAL PRIMARY KEY,
        dc_id INTEGER NOT NULL REFERENCES jobwork_dcs(id) ON DELETE CASCADE,
        from_vendor_id INTEGER NOT NULL REFERENCES master_vendors(id),
        to_vendor_id INTEGER NOT NULL REFERENCES master_vendors(id),
        vendor_dc_no VARCHAR(50),
        moved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        note TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CHECK (from_vendor_id <> to_vendor_id)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobwork_dc_movements_dc ON jobwork_dc_movements(dc_id);`);

    // ---- Returns --------------------------------------------------------------
    // GST is on job_charge only: gst_amount = job_charge * rate (computed in the API).

    await client.query(`
      CREATE TABLE IF NOT EXISTS jobwork_returns (
        id SERIAL PRIMARY KEY,
        dc_id INTEGER NOT NULL REFERENCES jobwork_dcs(id) ON DELETE CASCADE,
        vendor_id INTEGER NOT NULL REFERENCES master_vendors(id),
        vendor_dc_no VARCHAR(50),
        vendor_dc_date DATE,
        invoice_no VARCHAR(50),
        invoice_date DATE,
        job_charge NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (job_charge >= 0),
        sac_code VARCHAR(20),
        gst_rate_id INTEGER REFERENCES gst_rates(id),
        gst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
        total NUMERIC(14, 2) NOT NULL DEFAULT 0,
        received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobwork_returns_dc ON jobwork_returns(dc_id);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS jobwork_return_items (
        id SERIAL PRIMARY KEY,
        return_id INTEGER NOT NULL REFERENCES jobwork_returns(id) ON DELETE CASCADE,
        dc_item_id INTEGER NOT NULL REFERENCES jobwork_dc_items(id),
        quantity_received NUMERIC(12, 3) NOT NULL CHECK (quantity_received > 0),
        UNIQUE (return_id, dc_item_id)
      );
    `);

    await client.query('COMMIT');
    console.log('Internal Job Work v2 (Phase 1) migration applied.');
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
