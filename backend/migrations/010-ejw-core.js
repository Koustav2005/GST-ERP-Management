// External Job Work v2 - core tables (additive, idempotent).
// Run from backend/:  node migrations/010-ejw-core.js   (or npm run migrate:ejw-v2)
//
// A customer's component comes in on an inward (SE/IN), is planned on a work order (SE/WO), is marked
// ready by the PM and confirmed by Store, and goes back on a dispatch that issues TWO documents:
// a delivery challan (SE/DC series, component lines, no GST) and a tax invoice (SE/INV, job charge only).
// Quantities NUMERIC(12,3), money NUMERIC(14,2). Document numbers stay NULL while a dispatch is a draft
// (numbers are allocated on issue, so a draft that is abandoned leaves no gap); a cancelled dispatch
// keeps its numbers, which are never reused.

const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ---- work orders (SE/WO) ------------------------------------------------------------------
    // 1:1 with a projects row of type external_job_work, so workers, reports and material requests
    // keep working. source: 'stock' = created by a PM from inward stock (S1/S2); 'enquiry' = created
    // with the project at PO upload (S3).
    await client.query(`
      CREATE TABLE IF NOT EXISTS work_orders (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        wo_no VARCHAR(30) NOT NULL,
        customer_id INTEGER NOT NULL REFERENCES master_customers(id),
        project_id INTEGER UNIQUE REFERENCES projects(id) ON DELETE SET NULL,
        enquiry_id INTEGER REFERENCES enquiries(id) ON DELETE SET NULL,
        pm_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        source VARCHAR(10) NOT NULL DEFAULT 'stock' CHECK (source IN ('stock', 'enquiry')),
        status VARCHAR(30) NOT NULL DEFAULT 'awaiting_material'
          CHECK (status IN ('awaiting_material', 'open', 'in_process', 'ready', 'partially_dispatched', 'closed')),
        description TEXT,
        customer_po_no VARCHAR(100),
        expected_material_note TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP,
        UNIQUE (company_id, wo_no)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_work_orders_company_status ON work_orders (company_id, status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_work_orders_customer ON work_orders (customer_id);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS work_order_documents (
        id SERIAL PRIMARY KEY,
        wo_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
        kind VARCHAR(20) NOT NULL CHECK (kind IN ('drawing', 'quotation', 'inspection_report', 'customer_po', 'other')),
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        note TEXT,
        uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_work_order_documents_wo ON work_order_documents (wo_id);`);

    // ---- inwards (SE/IN) ----------------------------------------------------------------------
    // The customer's own DC no. is required unless a third party sent the material on their behalf
    // (S2: bill to customer, ship to us); then it can be attached later. Dispatch is blocked until it is.
    await client.query(`
      CREATE TABLE IF NOT EXISTS ejw_inwards (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        inward_no VARCHAR(30) NOT NULL,
        customer_id INTEGER NOT NULL REFERENCES master_customers(id),
        received_date DATE NOT NULL DEFAULT CURRENT_DATE,
        customer_dc_no VARCHAR(100),
        customer_dc_date DATE,
        third_party BOOLEAN NOT NULL DEFAULT FALSE,
        supplier_name VARCHAR(255),
        supplier_gstin VARCHAR(15),
        supplier_dc_no VARCHAR(100),
        supplier_dc_date DATE,
        eway_bill_no VARCHAR(12),
        vehicle_no VARCHAR(50),
        notes TEXT,
        status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
        received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP,
        UNIQUE (company_id, inward_no),
        CHECK (third_party OR NULLIF(BTRIM(customer_dc_no), '') IS NOT NULL),
        CHECK (NOT third_party OR NULLIF(BTRIM(supplier_name), '') IS NOT NULL),
        CHECK (eway_bill_no IS NULL OR eway_bill_no ~ '^[0-9]{12}$')
      );
    `);
    // the same customer DC cannot be inwarded twice
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ejw_inwards_customer_dc
        ON ejw_inwards (company_id, customer_id, LOWER(BTRIM(customer_dc_no))) WHERE NULLIF(BTRIM(customer_dc_no), '') IS NOT NULL;
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ejw_inwards_company_status ON ejw_inwards (company_id, status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ejw_inwards_customer ON ejw_inwards (customer_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ejw_inwards_received ON ejw_inwards (company_id, received_date);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ejw_inward_documents (
        id SERIAL PRIMARY KEY,
        inward_id INTEGER NOT NULL REFERENCES ejw_inwards(id) ON DELETE CASCADE,
        kind VARCHAR(20) NOT NULL CHECK (kind IN ('customer_dc', 'supplier_dc', 'eway_bill', 'photo', 'other')),
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ejw_inward_documents_inward ON ejw_inward_documents (inward_id);`);

    // issued_qty : handed to the shop floor      ready_qty : confirmed ready by Store
    // returned_qty : sent back on issued dispatches      short_closed_qty : closed by Accounts with a reason
    await client.query(`
      CREATE TABLE IF NOT EXISTS ejw_inward_items (
        id SERIAL PRIMARY KEY,
        inward_id INTEGER NOT NULL REFERENCES ejw_inwards(id) ON DELETE CASCADE,
        stock_item_id INTEGER NOT NULL REFERENCES stock_items(id),
        description VARCHAR(255),
        hsn VARCHAR(50),
        qty NUMERIC(12, 3) NOT NULL CHECK (qty > 0),
        unit VARCHAR(50) NOT NULL,
        unit_value NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (unit_value >= 0),
        total_value NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (total_value >= 0),
        wo_id INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
        issued_qty NUMERIC(12, 3) NOT NULL DEFAULT 0,
        ready_qty NUMERIC(12, 3) NOT NULL DEFAULT 0,
        returned_qty NUMERIC(12, 3) NOT NULL DEFAULT 0,
        short_closed_qty NUMERIC(12, 3) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CHECK (issued_qty >= 0 AND issued_qty <= qty),
        CHECK (ready_qty >= 0 AND ready_qty <= qty),
        CHECK (returned_qty >= 0 AND returned_qty <= ready_qty),
        CHECK (short_closed_qty >= 0 AND returned_qty + short_closed_qty <= qty)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ejw_inward_items_inward ON ejw_inward_items (inward_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ejw_inward_items_wo ON ejw_inward_items (wo_id) WHERE wo_id IS NOT NULL;`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ejw_inward_items_stock ON ejw_inward_items (stock_item_id);`);

    // Accounts only: quantity that will never come back (scrapped / lost / customer waived). Counts toward
    // closing the inward and the work order; always has a reason.
    await client.query(`
      CREATE TABLE IF NOT EXISTS ejw_short_closes (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        inward_item_id INTEGER NOT NULL REFERENCES ejw_inward_items(id),
        qty NUMERIC(12, 3) NOT NULL CHECK (qty > 0),
        reason TEXT NOT NULL CHECK (char_length(BTRIM(reason)) > 0),
        closed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ejw_short_closes_item ON ejw_short_closes (inward_item_id);`);

    // ---- ready notices: the PM's claim, then Store's confirmation of the physical quantity ------
    await client.query(`
      CREATE TABLE IF NOT EXISTS ejw_ready_notices (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        wo_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
        inspection_report_name TEXT,
        inspection_report_path TEXT,
        note TEXT,
        marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        confirmed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        confirmed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ejw_ready_notices_company_status ON ejw_ready_notices (company_id, status);`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ejw_ready_notice_items (
        id SERIAL PRIMARY KEY,
        notice_id INTEGER NOT NULL REFERENCES ejw_ready_notices(id) ON DELETE CASCADE,
        inward_item_id INTEGER NOT NULL REFERENCES ejw_inward_items(id),
        claimed_qty NUMERIC(12, 3) NOT NULL CHECK (claimed_qty > 0),
        confirmed_qty NUMERIC(12, 3) CHECK (confirmed_qty >= 0),
        UNIQUE (notice_id, inward_item_id)
      );
    `);

    // ---- dispatches: one event, two documents --------------------------------------------------
    //  delivery challan : dc_no / dc_date, component lines (ejw_dispatch_items), no GST
    //  tax invoice      : invoice_no / invoice_date, job charge only (taxable_value) + GST
    //  dispatch_total   : component_value + invoice_total, the value the e-way bill covers
    await client.query(`
      CREATE TABLE IF NOT EXISTS ejw_dispatches (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        wo_id INTEGER NOT NULL REFERENCES work_orders(id),
        customer_id INTEGER NOT NULL REFERENCES master_customers(id),
        status VARCHAR(10) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'cancelled')),
        dc_no VARCHAR(30),
        dc_date DATE,
        invoice_no VARCHAR(16),
        invoice_date DATE,
        customer_name VARCHAR(255) NOT NULL,
        customer_gstin VARCHAR(15),
        customer_address TEXT,
        customer_state VARCHAR(100),
        eway_bill_no VARCHAR(12),
        vehicle_no VARCHAR(50),
        component_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
        job_description VARCHAR(255),
        sac_code VARCHAR(10) NOT NULL DEFAULT '998875',
        taxable_value NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (taxable_value >= 0),
        gst_rate_id INTEGER REFERENCES gst_rates(id),
        gst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
        cgst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
        sgst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
        igst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
        invoice_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
        dispatch_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        issued_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        issued_at TIMESTAMP,
        cancelled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        cancelled_at TIMESTAMP,
        cancel_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CHECK (status = 'draft' OR (dc_no IS NOT NULL AND invoice_no IS NOT NULL)),
        CHECK (status <> 'cancelled' OR NULLIF(BTRIM(cancel_reason), '') IS NOT NULL),
        CHECK (eway_bill_no IS NULL OR eway_bill_no ~ '^[0-9]{12}$')
      );
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_ejw_dispatches_dc_no ON ejw_dispatches (company_id, dc_no) WHERE dc_no IS NOT NULL;`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_ejw_dispatches_invoice_no ON ejw_dispatches (company_id, invoice_no) WHERE invoice_no IS NOT NULL;`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ejw_dispatches_company_status ON ejw_dispatches (company_id, status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ejw_dispatches_customer ON ejw_dispatches (customer_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ejw_dispatches_wo ON ejw_dispatches (wo_id);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ejw_dispatch_items (
        id SERIAL PRIMARY KEY,
        dispatch_id INTEGER NOT NULL REFERENCES ejw_dispatches(id) ON DELETE CASCADE,
        inward_item_id INTEGER NOT NULL REFERENCES ejw_inward_items(id),
        description VARCHAR(255),
        hsn VARCHAR(50),
        qty NUMERIC(12, 3) NOT NULL CHECK (qty > 0),
        unit VARCHAR(50),
        unit_value NUMERIC(14, 2) NOT NULL DEFAULT 0,
        value NUMERIC(14, 2) NOT NULL DEFAULT 0,
        customer_dc_no VARCHAR(100),
        UNIQUE (dispatch_id, inward_item_id)
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ejw_dispatch_items_item ON ejw_dispatch_items (inward_item_id);`);

    await client.query('COMMIT');
    console.log('External Job Work v2 (core tables) migration applied.');
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
