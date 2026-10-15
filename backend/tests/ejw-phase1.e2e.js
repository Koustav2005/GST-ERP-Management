// External Job Work v2 - Phase 1: schema, customer master, document numbering.
// Run from backend/:  npm run test:ejw
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { createHarness } = require('./helpers/harness');
const { nextNumber, peekNumber, financialYear, resolveNumber } = require('../utils/numbering');

const h = createHarness({ port: 3921, name: 'ejw-phase1' });
const { tag, pool, assert, call, test, section, assertDbError } = h;

const withTx = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ---------- fixture helpers (plain SQL, so schema rules are tested without any API in between) ----------
const sql = async (text, params) => (await pool.query(text, params)).rows;
const mkCustomer = async (co, name, gstin = null) =>
  (await sql('INSERT INTO master_customers (company_id, name, gstin) VALUES ($1, $2, $3) RETURNING id', [co, `${tag} ${name}`, gstin]))[0].id;
const mkStock = async (co, name) =>
  (await sql("INSERT INTO stock_items (company_id, name, unit) VALUES ($1, $2, 'pcs') RETURNING id", [co, `${tag} ${name}`]))[0].id;
const mkInward = async (co, customer, no, dcNo = 'CUST-DC-1') => {
  const id = (await sql('INSERT INTO ejw_inwards (company_id, inward_no, customer_id, customer_dc_no) VALUES ($1, $2, $3, $4) RETURNING id', [co, no, customer, dcNo]))[0].id;
  await sql('INSERT INTO ejw_inward_receipts (inward_id, receipt_no) VALUES ($1, 1)', [id]);
  return id;
};
const mkItem = async (inward, stock, qty = 10) => {
  const receipt = (await sql('SELECT id FROM ejw_inward_receipts WHERE inward_id = $1 AND receipt_no = 1', [inward]))[0].id;
  return (await sql("INSERT INTO ejw_inward_items (inward_id, stock_item_id, qty, unit, receipt_id) VALUES ($1, $2, $3, 'pcs', $4) RETURNING id", [inward, stock, qty, receipt]))[0].id;
};
const mkProject = async (co, user) =>
  (await sql('INSERT INTO projects (name, company_id, created_by, project_type) VALUES ($1, $2, $3, $4) RETURNING id', [`${tag} P`, co, user, 'external_job_work']))[0].id;
const mkWo = async (co, customer, no, projectId = null) =>
  (await sql('INSERT INTO work_orders (company_id, wo_no, customer_id, project_id) VALUES ($1, $2, $3, $4) RETURNING id', [co, no, customer, projectId]))[0].id;

async function wipe(companyIds) {
  const ids = [companyIds];
  const steps = [
    'DELETE FROM ejw_short_closes WHERE company_id = ANY($1)',
    'DELETE FROM ejw_ready_notice_items WHERE notice_id IN (SELECT id FROM ejw_ready_notices WHERE company_id = ANY($1))',
    'DELETE FROM ejw_ready_notices WHERE company_id = ANY($1)',
    'DELETE FROM ejw_dispatch_items WHERE dispatch_id IN (SELECT id FROM ejw_dispatches WHERE company_id = ANY($1))',
    'DELETE FROM ejw_dispatches WHERE company_id = ANY($1)',
    'DELETE FROM ejw_inward_items WHERE inward_id IN (SELECT id FROM ejw_inwards WHERE company_id = ANY($1))',
    'DELETE FROM ejw_inward_receipts WHERE inward_id IN (SELECT id FROM ejw_inwards WHERE company_id = ANY($1))',
    'DELETE FROM ejw_inwards WHERE company_id = ANY($1)',
    'DELETE FROM work_orders WHERE company_id = ANY($1)',
    'DELETE FROM enquiries WHERE company_id = ANY($1)',
    'DELETE FROM jobwork_dc_items WHERE dc_id IN (SELECT id FROM jobwork_dcs WHERE company_id = ANY($1))',
    'DELETE FROM jobwork_dcs WHERE company_id = ANY($1)',
    'DELETE FROM job_work_requests WHERE company_id = ANY($1)',
    'DELETE FROM projects WHERE company_id = ANY($1)',
    'DELETE FROM master_customers WHERE company_id = ANY($1)',
    'DELETE FROM doc_sequences WHERE company_id = ANY($1)',
    'DELETE FROM stock_items WHERE company_id = ANY($1)',
    'DELETE FROM master_vendors WHERE company_id = ANY($1)'
  ];
  for (const s of steps) await pool.query(s, ids).catch((e) => console.log('  cleanup warn:', s.slice(0, 40), e.message));
}

(async () => {
  let coA; let coB; let A; let B;
  try {
    coA = await h.mkCompany('A', { gst_number: '29AAAAA0000A1Z5', state: 'Karnataka' });
    coB = await h.mkCompany('B', { gst_number: '33AAAAA0000A1Z5', state: 'Tamil Nadu' });
    A = {};
    for (const role of ['management', 'accountant', 'store_incharge', 'project_manager', 'npd', 'worker']) A[role] = await h.mkUser(role, coA);
    B = { management: await h.mkUser('management', coB), accountant: await h.mkUser('accountant', coB) };
    h.onCleanup(() => wipe(h.created.companies));
    await h.startServer();

    // ================================================================ schema
    section('Schema (migrations 008-012)');
    await test('all new tables exist', async () => {
      const want = ['master_customers', 'doc_sequences', 'work_orders', 'work_order_documents', 'ejw_inwards', 'ejw_inward_items',
        'ejw_inward_documents', 'ejw_inward_receipts', 'ejw_short_closes', 'ejw_ready_notices', 'ejw_ready_notice_items', 'ejw_dispatches', 'ejw_dispatch_items'];
      const have = (await sql("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).map((r) => r.table_name);
      assert.deepEqual(want.filter((t) => !have.includes(t)), []);
    });
    await test('link columns exist on the existing tables', async () => {
      const rows = await sql(`SELECT table_name, column_name FROM information_schema.columns WHERE
        (table_name = 'enquiries' AND column_name = 'customer_id') OR
        (table_name = 'external_jobwork_outstock_request_items' AND column_name = 'ejw_inward_item_id') OR
        (table_name = 'external_jobwork_outstock_transaction_items' AND column_name = 'ejw_inward_item_id') OR
        (table_name = 'stock_item_requests' AND column_name = 'ejw_inward_item_id')`);
      assert.equal(rows.length, 4);
    });
    await test('quantities are NUMERIC(12,3) and money NUMERIC(14,2); no float columns', async () => {
      const cols = await sql(`SELECT table_name, column_name, numeric_precision p, numeric_scale s FROM information_schema.columns
        WHERE table_name IN ('ejw_inward_items', 'ejw_dispatches', 'ejw_dispatch_items', 'ejw_short_closes', 'ejw_ready_notice_items') AND data_type = 'numeric'`);
      for (const c of cols) {
        const qtyCol = /qty|quantity/.test(c.column_name);
        assert.deepEqual([c.p, c.s], qtyCol ? [12, 3] : [14, 2], `${c.table_name}.${c.column_name}`);
      }
      const floats = await sql(`SELECT 1 FROM information_schema.columns WHERE table_name LIKE 'ejw_%' AND data_type IN ('real', 'double precision')`);
      assert.equal(floats.length, 0);
    });

    const custX = await mkCustomer(coA, 'Cust X', '29BBBBB1111B1Z5');
    const custY = await mkCustomer(coA, 'Cust Y');
    const stockS = await mkStock(coA, 'Shaft');

    await test('inward: customer DC required unless a third party sent it; supplier named; e-way 12 digits', async () => {
      await assertDbError('23514', "INSERT INTO ejw_inwards (company_id, inward_no, customer_id) VALUES ($1, 'SE/IN/T1', $2)", [coA, custX]);
      await assertDbError('23514', "INSERT INTO ejw_inwards (company_id, inward_no, customer_id, customer_dc_no) VALUES ($1, 'SE/IN/T2', $2, '   ')", [coA, custX]);
      await sql("INSERT INTO ejw_inwards (company_id, inward_no, customer_id, third_party, supplier_name) VALUES ($1, 'SE/IN/T3', $2, true, 'Supplier A') RETURNING id", [coA, custX]);
      await assertDbError('23514', "INSERT INTO ejw_inwards (company_id, inward_no, customer_id, third_party) VALUES ($1, 'SE/IN/T4', $2, true)", [coA, custX]);
      await assertDbError('23514', "INSERT INTO ejw_inwards (company_id, inward_no, customer_id, customer_dc_no, eway_bill_no) VALUES ($1, 'SE/IN/T5', $2, 'D5', '12345')", [coA, custX]);
      await sql("INSERT INTO ejw_inwards (company_id, inward_no, customer_id, customer_dc_no, eway_bill_no) VALUES ($1, 'SE/IN/T6', $2, 'D6', '271234567890')", [coA, custX]);
    });
    await test('customer DC: unique per (customer, DC no, DC date); the same number on another date or for another customer is allowed', async () => {
      const inward1 = await mkInward(coA, custX, 'SE/IN/D1', 'X020');
      assert.ok(inward1);
      await sql("UPDATE ejw_inwards SET customer_dc_date = '2026-04-10' WHERE id = $1", [inward1]);
      await assertDbError('23505', "INSERT INTO ejw_inwards (company_id, inward_no, customer_id, customer_dc_no, customer_dc_date) VALUES ($1, 'SE/IN/D2', $2, ' x020 ', '2026-04-10')", [coA, custX]); // same number and date, any case / spaces
      await sql("INSERT INTO ejw_inwards (company_id, inward_no, customer_id, customer_dc_no, customer_dc_date) VALUES ($1, 'SE/IN/D4', $2, 'X020', '2027-02-01')", [coA, custX]); // the customer reused the number next year
      await sql("INSERT INTO ejw_inwards (company_id, inward_no, customer_id, customer_dc_no, customer_dc_date) VALUES ($1, 'SE/IN/D3', $2, 'X020', '2026-04-10')", [coA, custY]); // another customer
      await sql("INSERT INTO ejw_inwards (company_id, inward_no, customer_id, customer_dc_no) VALUES ($1, 'SE/IN/D5', $2, 'NODATE')", [coA, custX]);
      await assertDbError('23505', "INSERT INTO ejw_inwards (company_id, inward_no, customer_id, customer_dc_no) VALUES ($1, 'SE/IN/D6', $2, 'nodate')", [coA, custX]); // no date counts as one value
      await assertDbError('23505', "INSERT INTO ejw_inwards (company_id, inward_no, customer_id, customer_dc_no) VALUES ($1, 'SE/IN/D1', $2, 'ZZ')", [coA, custY]); // inward number unique per company
    });
    await test('receipts: several trucks per inward, numbered, each with its own date, vehicle and e-way bill; items must belong to one', async () => {
      const inward = await mkInward(coA, custX, 'SE/IN/R1', 'R1');
      await sql("INSERT INTO ejw_inward_receipts (inward_id, receipt_no, received_date, vehicle_no, eway_bill_no) VALUES ($1, 2, '2026-10-20', 'KA01XX1111', '271234567890')", [inward]);
      await assertDbError('23505', 'INSERT INTO ejw_inward_receipts (inward_id, receipt_no) VALUES ($1, 2)', [inward]);
      await assertDbError('23514', "INSERT INTO ejw_inward_receipts (inward_id, receipt_no, eway_bill_no) VALUES ($1, 3, '1234')", [inward]);
      await assertDbError('23502', "INSERT INTO ejw_inward_items (inward_id, stock_item_id, qty, unit) VALUES ($1, $2, 1, 'pcs')", [inward, stockS]); // receipt_id is mandatory
    });
    await test('inward item CHECKs: qty > 0, issued <= qty, ready <= qty, returned <= ready, returned + short-closed <= qty', async () => {
      const inward = await mkInward(coA, custX, 'SE/IN/C1', 'C1');
      const item = await mkItem(inward, stockS, 10);
      const receipt = (await sql('SELECT id FROM ejw_inward_receipts WHERE inward_id = $1', [inward]))[0].id;
      await assertDbError('23514', "INSERT INTO ejw_inward_items (inward_id, stock_item_id, qty, unit, receipt_id) VALUES ($1, $2, 0, 'pcs', $3)", [inward, stockS, receipt]);
      await assertDbError('23514', 'UPDATE ejw_inward_items SET issued_qty = 10.001 WHERE id = $1', [item]);
      await assertDbError('23514', 'UPDATE ejw_inward_items SET ready_qty = 11 WHERE id = $1', [item]);
      await assertDbError('23514', 'UPDATE ejw_inward_items SET returned_qty = 1 WHERE id = $1', [item]); // nothing ready yet
      await sql('UPDATE ejw_inward_items SET issued_qty = 10, ready_qty = 6, returned_qty = 4 WHERE id = $1', [item]);
      await assertDbError('23514', 'UPDATE ejw_inward_items SET returned_qty = 7 WHERE id = $1', [item]);
      await assertDbError('23514', 'UPDATE ejw_inward_items SET short_closed_qty = 6.001 WHERE id = $1', [item]); // 4 + 6.001 > 10
      await sql('UPDATE ejw_inward_items SET short_closed_qty = 6 WHERE id = $1', [item]); // 4 returned + 6 short-closed = 10: the item is closed
    });
    await test('short close: quantity > 0 and a non-blank reason are mandatory', async () => {
      const inward = await mkInward(coA, custX, 'SE/IN/C2', 'C2');
      const item = await mkItem(inward, stockS, 5);
      await assertDbError('23514', "INSERT INTO ejw_short_closes (company_id, inward_item_id, qty, reason) VALUES ($1, $2, 1, '   ')", [coA, item]);
      await assertDbError('23514', "INSERT INTO ejw_short_closes (company_id, inward_item_id, qty, reason) VALUES ($1, $2, 0, 'scrapped')", [coA, item]);
      await sql("INSERT INTO ejw_short_closes (company_id, inward_item_id, qty, reason) VALUES ($1, $2, 1, 'scrapped in machining')", [coA, item]);
    });
    await test('work order: status list, wo_no unique per company, one work order per project', async () => {
      const user = A.project_manager.id;
      const p = await mkProject(coA, user);
      await mkWo(coA, custX, 'SE/WO/T1', p);
      await assertDbError('23505', "INSERT INTO work_orders (company_id, wo_no, customer_id, project_id) VALUES ($1, 'SE/WO/T2', $2, $3)", [coA, custX, p]);
      await assertDbError('23505', "INSERT INTO work_orders (company_id, wo_no, customer_id) VALUES ($1, 'SE/WO/T1', $2)", [coA, custX]);
      await assertDbError('23514', "INSERT INTO work_orders (company_id, wo_no, customer_id, status) VALUES ($1, 'SE/WO/T3', $2, 'finished')", [coA, custX]);
      for (const status of ['awaiting_material', 'open', 'in_process', 'ready', 'partially_dispatched', 'closed']) {
        await sql('INSERT INTO work_orders (company_id, wo_no, customer_id, status) VALUES ($1, $2, $3, $4)', [coA, `SE/WO/S-${status}`.slice(0, 30), custX, status]);
      }
    });
    await test('dispatch: numbers only once issued; cancelled needs a reason; invoice no <= 16 chars; unique per company (invoice: per financial year)', async () => {
      const wo = await mkWo(coA, custX, 'SE/WO/DSP');
      const ins = (cols, vals) => [`INSERT INTO ejw_dispatches (company_id, wo_id, customer_id, customer_name, ${cols}) VALUES ($1, $2, $3, 'X', ${vals})`, [coA, wo, custX]];
      for (let i = 0; i < 2; i += 1) await sql(...ins('status', "'draft'")); // drafts carry no numbers, so several can exist
      await assertDbError('23514', ...ins('status', "'issued'"));
      await assertDbError('23514', ...ins('status, dc_no, invoice_no, invoice_fy', "'issued', 'SE/DC/9001', NULL, NULL"));
      await assertDbError('23514', ...ins('status', "'cancelled'"));
      await assertDbError('23514', ...ins('status, dc_no, invoice_no, invoice_fy, cancel_reason', "'cancelled', 'SE/DC/9002', 'SE/INV/2627/0090', '2627', '  '"));
      await assertDbError('22001', ...ins('status, dc_no, invoice_no, invoice_fy', "'issued', 'SE/DC/9003', 'SE/INV/2627/10001', '2627'")); // 17 characters
      await assertDbError('23514', ...ins('status, dc_no, invoice_no', "'issued', 'SE/DC/9007', 'SE/INV/2627/0091'")); // an invoice number needs its financial year
      await sql(...ins('status, dc_no, invoice_no, invoice_fy', "'issued', 'SE/DC/9004', 'SE/INV/2627/0001', '2627'"));
      await assertDbError('23505', ...ins('status, dc_no, invoice_no, invoice_fy', "'issued', 'SE/DC/9004', 'SE/INV/2627/0002', '2627'")); // DC number
      await assertDbError('23505', ...ins('status, dc_no, invoice_no, invoice_fy', "'issued', 'SE/DC/9005', 'SE/INV/2627/0001', '2627'")); // invoice number, same year
      await sql(...ins('status, dc_no, invoice_no, invoice_fy', "'issued', 'SE/DC/9008', '001', '2728'")); // a Tally-style number restarts next year
      await sql(...ins('status, dc_no, invoice_no, invoice_fy', "'issued', 'SE/DC/9009', '001', '2829'"));
      await assertDbError('23505', ...ins('status, dc_no, invoice_no, invoice_fy', "'issued', 'SE/DC/9010', '001', '2728'"));
      await sql(...ins('status, dc_no, invoice_no, invoice_fy, cancel_reason', "'cancelled', 'SE/DC/9006', 'SE/INV/2627/0003', '2627', 'wrong rate'"));
      await assertDbError('23514', ...ins('eway_bill_no', "'12AB'"));
    });
    await test('a dispatch item is unique per dispatch and inward item; a customer in use cannot be deleted', async () => {
      const inward = await mkInward(coA, custY, 'SE/IN/DI', 'DI-1');
      const item = await mkItem(inward, stockS, 4);
      const wo = await mkWo(coA, custY, 'SE/WO/DI');
      const d = (await sql("INSERT INTO ejw_dispatches (company_id, wo_id, customer_id, customer_name) VALUES ($1, $2, $3, 'Y') RETURNING id", [coA, wo, custY]))[0].id;
      await sql('INSERT INTO ejw_dispatch_items (dispatch_id, inward_item_id, qty) VALUES ($1, $2, 2)', [d, item]);
      await assertDbError('23505', 'INSERT INTO ejw_dispatch_items (dispatch_id, inward_item_id, qty) VALUES ($1, $2, 1)', [d, item]);
      await assertDbError('23514', 'INSERT INTO ejw_dispatch_items (dispatch_id, inward_item_id, qty) VALUES ($1, $2, 0)', [(await sql("INSERT INTO ejw_dispatches (company_id, wo_id, customer_id, customer_name) VALUES ($1, $2, $3, 'Y') RETURNING id", [coA, wo, custY]))[0].id, item]);
      await assertDbError('23503', 'DELETE FROM master_customers WHERE id = $1', [custY]);
    });
    await test('doc_sequences only allows the four series', async () => {
      await assertDbError('23514', "INSERT INTO doc_sequences (company_id, series) VALUES ($1, 'XX')", [coA]);
    });
    await test('deleting a customer clears the link on its enquiries (ON DELETE SET NULL)', async () => {
      const c = await mkCustomer(coA, 'Enquirer');
      const e = (await sql("INSERT INTO enquiries (enquiry_number, company_id, pdf_filename, pdf_path, customer_id) VALUES ($1, $2, 'x.pdf', '/x', $3) RETURNING id", [`EN${Date.now() % 1e9}`, coA, c]))[0].id;
      await sql('DELETE FROM master_customers WHERE id = $1', [c]);
      assert.equal((await sql('SELECT customer_id FROM enquiries WHERE id = $1', [e]))[0].customer_id, null);
    });

    // ================================================================ customer master API
    section('Customer master (/api/master-customers)');
    const URL = '/api/master-customers';
    let cust1;
    await test('management and accountant can create; the GSTIN fixes the state (GSTIN wins over typed text)', async () => {
      const r = await call('POST', URL, A.management, { name: `${tag} Alpha Castings`, gstin: '29abcde1234f1z5', state: 'Tamil Nadu', email: 'a@alpha.test', phone: '9800000000', billing_address: 'Bengaluru', works_address: 'Peenya' });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      cust1 = r.body.customer;
      assert.equal(cust1.gstin, '29ABCDE1234F1Z5'); // upper-cased
      assert.equal(cust1.state, 'Karnataka');
      assert.equal(cust1.is_active, true);
      const r2 = await call('POST', URL, A.accountant, { name: `${tag} Beta Forge` });
      assert.equal(r2.status, 201);
      assert.equal(r2.body.customer.gstin, null);
    });
    await test('state typed without a GSTIN is kept as typed', async () => {
      const r = await call('POST', URL, A.accountant, { name: `${tag} Gamma`, state: 'Kerala' });
      assert.equal(r.body.customer.state, 'Kerala');
    });
    await test('store, PM, NPD, worker cannot create or change (403)', async () => {
      for (const role of ['store_incharge', 'project_manager', 'npd', 'worker']) {
        assert.equal((await call('POST', URL, A[role], { name: 'x' })).status, 403, role);
        assert.equal((await call('PUT', `${URL}/${cust1.id}`, A[role], { phone: '1' })).status, 403, role);
        assert.equal((await call('DELETE', `${URL}/${cust1.id}`, A[role])).status, 403, role);
      }
    });
    await test('store, PM, NPD, accountant, management can read; a worker cannot (403)', async () => {
      for (const role of ['store_incharge', 'project_manager', 'npd', 'accountant', 'management']) {
        const r = await call('GET', URL, A[role]);
        assert.equal(r.status, 200, role);
        assert.ok(r.body.customers.some((c) => c.id === cust1.id), role);
        assert.equal((await call('GET', `${URL}/${cust1.id}`, A[role])).status, 200, role);
      }
      assert.equal((await call('GET', URL, A.worker)).status, 403);
    });
    await test('validation: name required, GSTIN format, GSTIN state code, email', async () => {
      assert.equal((await call('POST', URL, A.management, { name: '  ' })).status, 400);
      assert.equal((await call('POST', URL, A.management, { name: 'v1', gstin: '29ABCDE1234F1Z' })).status, 400);       // 14 chars
      assert.equal((await call('POST', URL, A.management, { name: 'v2', gstin: 'ABCDE1234F1Z5XX' })).status, 400);       // not GST format
      const badCode = await call('POST', URL, A.management, { name: 'v3', gstin: '99ABCDE1234F1Z5' });
      assert.equal(badCode.status, 400);
      assert.match(badCode.body.error, /state code/);
      assert.equal((await call('POST', URL, A.management, { name: 'v4', email: 'not-an-email' })).status, 400);
    });
    await test('duplicates: same name (any case) 409; same GSTIN 409; the same GSTIN in another company is fine', async () => {
      const dupName = await call('POST', URL, A.management, { name: `${tag} ALPHA castings` });
      assert.equal(dupName.status, 409);
      assert.match(dupName.body.error, /name already exists/);
      const dupGstin = await call('POST', URL, A.management, { name: `${tag} Other Name`, gstin: '29ABCDE1234F1Z5' });
      assert.equal(dupGstin.status, 409);
      assert.match(dupGstin.body.error, /GSTIN already exists/);
      assert.equal((await call('POST', URL, B.management, { name: `${tag} Alpha Castings`, gstin: '29ABCDE1234F1Z5' })).status, 201);
    });
    await test('company scoping: another company sees nothing and gets 404', async () => {
      assert.equal((await call('GET', `${URL}/${cust1.id}`, B.accountant)).status, 404);
      assert.equal((await call('PUT', `${URL}/${cust1.id}`, B.management, { phone: '1' })).status, 404);
      assert.equal((await call('DELETE', `${URL}/${cust1.id}`, B.management)).status, 404);
      const list = (await call('GET', URL, B.accountant)).body.customers;
      assert.ok(!list.some((c) => c.id === cust1.id));
    });
    await test('update: partial, GSTIN change re-derives the state, duplicate name 409, empty update 400', async () => {
      const r = await call('PUT', `${URL}/${cust1.id}`, A.accountant, { phone: '9811111111' });
      assert.equal(r.status, 200);
      assert.equal(r.body.customer.phone, '9811111111');
      assert.equal(r.body.customer.name, `${tag} Alpha Castings`); // untouched
      const moved = await call('PUT', `${URL}/${cust1.id}`, A.management, { gstin: '33AAACT2727Q1ZV' });
      assert.equal(moved.body.customer.state, 'Tamil Nadu');
      assert.equal((await call('PUT', `${URL}/${cust1.id}`, A.management, { name: `${tag} beta forge` })).status, 409);
      assert.equal((await call('PUT', `${URL}/${cust1.id}`, A.management, {})).status, 400);
    });
    await test('search, and deactivated customers are hidden from pickers unless asked for', async () => {
      const beta = (await call('GET', `${URL}?search=beta forge`, A.store_incharge)).body.customers[0];
      assert.equal(beta.name, `${tag} Beta Forge`);
      assert.equal((await call('PUT', `${URL}/${beta.id}`, A.accountant, { is_active: false })).body.customer.is_active, false);
      assert.ok(!(await call('GET', URL, A.store_incharge)).body.customers.some((c) => c.id === beta.id));
      assert.ok((await call('GET', `${URL}?include_inactive=1`, A.store_incharge)).body.customers.some((c) => c.id === beta.id));
    });
    await test('delete: an unused customer goes; one with material cannot be deleted (409, deactivate instead)', async () => {
      const unused = (await call('POST', URL, A.accountant, { name: `${tag} Temp` })).body.customer;
      assert.equal((await call('DELETE', `${URL}/${unused.id}`, A.accountant)).status, 200);
      assert.equal((await call('GET', `${URL}/${unused.id}`, A.accountant)).status, 404);
      await mkInward(coA, cust1.id, 'SE/IN/USED', 'USED-1');
      const blocked = await call('DELETE', `${URL}/${cust1.id}`, A.management);
      assert.equal(blocked.status, 409);
      assert.match(blocked.body.error, /Deactivate/);
    });

    // ================================================================ numbering
    section('Document numbering (utils/numbering.js, /api/doc-sequences)');
    await test('financial year: April to March', async () => {
      assert.deepEqual(financialYear('2026-03-31'), { start: 2025, label: '2526' });
      assert.deepEqual(financialYear('2026-04-01'), { start: 2026, label: '2627' });
      assert.deepEqual(financialYear('2027-01-15'), { start: 2026, label: '2627' });
      assert.deepEqual(financialYear('2027-03-31'), { start: 2026, label: '2627' });
      assert.deepEqual(financialYear('2027-04-01'), { start: 2027, label: '2728' });
      assert.deepEqual(financialYear('2099-12-31'), { start: 2099, label: '9900' });
    });
    const coN = await h.mkCompany('numbers');
    await test('IN, WO, DC are continuous with their prefixes and zero padding', async () => {
      assert.equal(await withTx((c) => nextNumber(c, coN, 'IN')), 'SE/IN/0001');
      assert.equal(await withTx((c) => nextNumber(c, coN, 'IN')), 'SE/IN/0002');
      assert.equal(await withTx((c) => nextNumber(c, coN, 'WO')), 'SE/WO/0001');
      assert.equal(await withTx((c) => nextNumber(c, coN, 'DC')), 'SE/DC/0001');
      assert.equal(await withTx((c) => nextNumber(c, coN, 'DC', { date: '2031-05-05' })), 'SE/DC/0002'); // dates do not restart these
    });
    await test('GAPLESS: a number allocated in a rolled-back transaction is handed out again', async () => {
      await assert.rejects(withTx(async (c) => {
        assert.equal(await nextNumber(c, coN, 'IN'), 'SE/IN/0003');
        throw new Error('document failed to save');
      }), /failed to save/);
      assert.equal(await withTx((c) => nextNumber(c, coN, 'IN')), 'SE/IN/0003');
    });
    await test('CONCURRENT: 8 transactions at once get 8 different, consecutive numbers', async () => {
      const numbers = await Promise.all(Array.from({ length: 8 }, () => withTx((c) => nextNumber(c, coN, 'WO'))));
      assert.equal(new Set(numbers).size, 8);
      assert.deepEqual([...numbers].sort(), Array.from({ length: 8 }, (_, i) => `SE/WO/${String(i + 2).padStart(4, '0')}`));
    });
    await test('INV: SE/INV/2627/0001 format, always 16 characters, restarts on 1 April, never numbers an earlier year', async () => {
      assert.equal(await withTx((c) => nextNumber(c, coN, 'INV', { date: '2026-10-14' })), 'SE/INV/2627/0001');
      assert.equal(await withTx((c) => nextNumber(c, coN, 'INV', { date: '2026-10-15' })), 'SE/INV/2627/0002');
      const last = await withTx((c) => nextNumber(c, coN, 'INV', { date: '2027-03-31' }));
      assert.equal(last, 'SE/INV/2627/0003');
      assert.equal(last.length, 16);
      assert.equal(await withTx((c) => nextNumber(c, coN, 'INV', { date: '2027-04-01' })), 'SE/INV/2728/0001'); // new financial year
      await assert.rejects(withTx((c) => nextNumber(c, coN, 'INV', { date: '2027-03-31' })), /already moved on to 2728/);
      assert.equal(await withTx((c) => nextNumber(c, coN, 'INV', { date: '2027-06-01' })), 'SE/INV/2728/0002'); // the refused call used no number
    });
    await test('INV: 9,999 a year; the 10,000th would be 17 characters, so it is refused and the counter is not consumed', async () => {
      await sql("UPDATE doc_sequences SET last_value = 9998 WHERE company_id = $1 AND series = 'INV'", [coN]);
      const n9999 = await withTx((c) => nextNumber(c, coN, 'INV', { date: '2027-06-02' }));
      assert.equal(n9999, 'SE/INV/2728/9999');
      assert.equal(n9999.length, 16);
      await assert.rejects(withTx((c) => nextNumber(c, coN, 'INV', { date: '2027-06-02' })), /longer than 16/);
      assert.equal((await sql("SELECT last_value FROM doc_sequences WHERE company_id = $1 AND series = 'INV'", [coN]))[0].last_value, 9999);
      assert.equal(await withTx((c) => nextNumber(c, coN, 'INV', { date: '2028-04-01' })), 'SE/INV/2829/0001'); // the new year makes room again
    });
    await test('a number already used elsewhere (a hand-typed DC number) is skipped, in BOTH DC tables', async () => {
      const coS = await h.mkCompany('skip');
      const cust = await mkCustomer(coS, 'S');
      const wo = await mkWo(coS, cust, 'SE/WO/0001');
      await sql("INSERT INTO ejw_dispatches (company_id, wo_id, customer_id, customer_name, dc_no) VALUES ($1, $2, $3, 'S', 'SE/DC/0001')", [coS, wo, cust]);
      await sql("INSERT INTO master_vendors (name, company_id) VALUES ($1, $2)", [`${tag} v`, coS]);
      const v = (await sql('SELECT id FROM master_vendors WHERE company_id = $1', [coS]))[0].id;
      await sql("INSERT INTO jobwork_dcs (company_id, dc_number, vendor_id, vendor_name) VALUES ($1, 'SE/DC/0002', $2, 'v')", [coS, v]);
      assert.equal(await withTx((c) => nextNumber(c, coS, 'DC')), 'SE/DC/0003');
    });

    await test('migration 009 carries over the DC numbers internal job work already used', async () => {
      const coC = await h.mkCompany('carry');
      await sql("INSERT INTO master_vendors (name, company_id) VALUES ($1, $2)", [`${tag} vc`, coC]);
      const v = (await sql('SELECT id FROM master_vendors WHERE company_id = $1', [coC]))[0].id;
      await sql("INSERT INTO jobwork_dcs (company_id, dc_number, vendor_id, vendor_name) VALUES ($1, 'SE/DC/0007', $2, 'vc'), ($1, 'MANUAL-1', $2, 'vc'), ($1, 'SE/DC/0003', $2, 'vc')", [coC, v]);
      assert.equal((await sql('SELECT 1 FROM doc_sequences WHERE company_id = $1', [coC])).length, 0);
      execFileSync(process.execPath, [path.join(__dirname, '../migrations/009-doc-sequences.js')], { stdio: 'pipe' });
      assert.equal((await sql("SELECT last_value FROM doc_sequences WHERE company_id = $1 AND series = 'DC'", [coC]))[0].last_value, 7);
      assert.equal(await withTx((c) => nextNumber(c, coC, 'DC')), 'SE/DC/0008');
    });

    const SEQ = '/api/doc-sequences';
    await test('GET /api/doc-sequences: accountant and management see the four series with the next number; others 403', async () => {
      const r = await call('GET', SEQ, A.accountant);
      assert.equal(r.status, 200);
      assert.deepEqual(r.body.sequences.map((s) => s.series), ['DC', 'IN', 'WO', 'INV']);
      const by = Object.fromEntries(r.body.sequences.map((s) => [s.series, s]));
      assert.equal(by.DC.next_number, 'SE/DC/0001');
      assert.equal(by.IN.reset_yearly, false);
      assert.equal(by.INV.reset_yearly, true);
      assert.match(by.INV.next_number, /^SE\/INV\/\d{4}\/0001$/);
      assert.equal(by.DC.number_source, 'app');
      assert.equal(by.DC.can_be_manual, true);
      assert.equal(by.IN.can_be_manual, false);
      assert.equal(by.INV.max_length, 16);
      assert.equal((await call('GET', SEQ, A.management)).status, 200);
      for (const role of ['store_incharge', 'project_manager', 'npd', 'worker']) assert.equal((await call('GET', SEQ, A[role])).status, 403, role);
    });
    await test('the "restart each financial year" setting: management only, validated, per company', async () => {
      assert.equal((await call('PUT', `${SEQ}/DC`, A.accountant, { reset_yearly: true })).status, 403);
      assert.equal((await call('PUT', `${SEQ}/DC`, A.management, { reset_yearly: 'yes' })).status, 400);
      assert.equal((await call('PUT', `${SEQ}/DC`, A.management, {})).status, 400);
      assert.equal((await call('PUT', `${SEQ}/ZZ`, A.management, { reset_yearly: true })).status, 404);
      const on = await call('PUT', `${SEQ}/DC`, A.management, { reset_yearly: true });
      assert.equal(on.status, 200);
      assert.match(on.body.sequences.find((s) => s.series === 'DC').next_number, /^SE\/DC\/\d{4}\/0001$/);
      assert.equal((await call('GET', SEQ, B.accountant)).body.sequences.find((s) => s.series === 'DC').reset_yearly, false); // other company untouched
      const off = await call('PUT', `${SEQ}/DC`, A.management, { reset_yearly: false });
      assert.equal(off.body.sequences.find((s) => s.series === 'DC').next_number, 'SE/DC/0001');
    });

    const coT = await h.mkCompany('typed');
    const putRow = (series, set) => sql(`UPDATE doc_sequences SET ${set} WHERE company_id = $1 AND series = $2`, [coT, series]);
    const cT = await mkCustomer(coT, 'Typed');
    const woT = await mkWo(coT, cT, 'SE/WO/T');
    const issuedInvoice = (no, fy) => sql("INSERT INTO ejw_dispatches (company_id, wo_id, customer_id, customer_name, status, dc_no, invoice_no, invoice_fy) VALUES ($1, $2, $3, 'T', 'issued', $4, $5, $6)", [coT, woT, cT, `DC-${no}-${fy}`, no, fy]);
    await test('TYPED invoice numbers (from Tally): at most 16 characters, letters / digits / "/" / "-" only', async () => {
      const ok = await withTx((c) => resolveNumber(c, coT, 'INV', { typed: ' TLY/26-27/001 ', date: '2026-10-14' }));
      assert.deepEqual(ok, { number: 'TLY/26-27/001', fy: '2627', manual: true });
      assert.equal((await withTx((c) => resolveNumber(c, coT, 'INV', { typed: '1234567890123456', date: '2026-10-14' }))).number.length, 16);
      await assert.rejects(withTx((c) => resolveNumber(c, coT, 'INV', { typed: '12345678901234567', date: '2026-10-14' })), /at most 16 characters/);
      await assert.rejects(withTx((c) => resolveNumber(c, coT, 'INV', { typed: 'INV 001', date: '2026-10-14' })), /letters, digits/);
      await assert.rejects(withTx((c) => resolveNumber(c, coT, 'INV', { typed: 'INV#001', date: '2026-10-14' })), /letters, digits/);
      assert.equal((await sql("SELECT last_value FROM doc_sequences WHERE company_id = $1 AND series = 'INV'", [coT]))[0].last_value, 0); // typing a number never touches the counter
    });
    await test('TYPED invoice numbers are unique within the financial year only', async () => {
      await issuedInvoice('001', '2627');
      const dup = await withTx((c) => resolveNumber(c, coT, 'INV', { typed: '001', date: '2026-12-01' })).catch((e) => e);
      assert.equal(dup.status, 409);
      assert.match(dup.message, /already used in FY 2627/);
      assert.equal((await withTx((c) => resolveNumber(c, coT, 'INV', { typed: '001', date: '2027-04-02' }))).fy, '2728'); // next financial year: free again
      assert.equal((await withTx((c) => resolveNumber(c, coT, 'INV', { typed: '002', date: '2026-12-01' }))).number, '002');
    });
    await test('an automatic invoice number skips a typed one that happens to match, and a DC typed number is checked in both tables', async () => {
      await issuedInvoice('SE/INV/2627/0001', '2627');
      assert.equal(await withTx((c) => nextNumber(c, coT, 'INV', { date: '2026-10-14' })), 'SE/INV/2627/0002');
      const dcClash = await withTx((c) => resolveNumber(c, coT, 'DC', { typed: `DC-001-2627`, maxLength: 16 })).catch((e) => e);
      assert.equal(dcClash.status, 409);
      assert.equal((await withTx((c) => resolveNumber(c, coT, 'DC', { typed: 'TLY-DC-1', maxLength: 16 }))).number, 'TLY-DC-1');
      await assert.rejects(withTx((c) => resolveNumber(c, coT, 'DC', { typed: 'THIS-IS-TOO-LONG-FOR-GST', maxLength: 16 })), /at most 16/);
    });
    await test('NUMBER SOURCE: "app" (default) auto-allocates when nothing is typed; "manual" (Tally) refuses to invent a DC or invoice number', async () => {
      const auto = await withTx((c) => resolveNumber(c, coT, 'INV', { date: '2026-10-20' }));
      assert.equal(auto.manual, false);
      assert.match(auto.number, /^SE\/INV\/2627\/\d{4}$/);
      await putRow('INV', "number_source = 'manual'");
      await putRow('DC', "number_source = 'manual'");
      const noInv = await withTx((c) => resolveNumber(c, coT, 'INV', { date: '2026-10-20' })).catch((e) => e);
      assert.equal(noInv.status, 400);
      assert.match(noInv.message, /enters invoice numbers from Tally/);
      const noDc = await withTx((c) => resolveNumber(c, coT, 'DC', {})).catch((e) => e);
      assert.equal(noDc.status, 400);
      assert.match(noDc.message, /enters DC numbers from Tally/);
      assert.equal((await withTx((c) => resolveNumber(c, coT, 'INV', { typed: 'TLY-777', date: '2026-10-20' }))).number, 'TLY-777'); // typing works
      await putRow('INV', "number_source = 'app'");
      await putRow('DC', "number_source = 'app'");
    });
    await test('NUMBER SOURCE setting via the API: management only, DC and INV only, validated, per company', async () => {
      assert.equal((await call('PUT', `${SEQ}/INV`, A.accountant, { number_source: 'manual' })).status, 403);
      assert.equal((await call('PUT', `${SEQ}/INV`, A.management, { number_source: 'tally' })).status, 400);
      assert.equal((await call('PUT', `${SEQ}/IN`, A.management, { number_source: 'manual' })).status, 400);
      assert.equal((await call('PUT', `${SEQ}/WO`, A.management, { number_source: 'manual' })).status, 400);
      const on = await call('PUT', `${SEQ}/INV`, A.management, { number_source: 'manual' });
      assert.equal(on.status, 200);
      assert.equal(on.body.sequences.find((x) => x.series === 'INV').number_source, 'manual');
      assert.equal((await call('GET', SEQ, B.accountant)).body.sequences.find((x) => x.series === 'INV').number_source, 'app'); // other company untouched
      assert.equal((await call('PUT', `${SEQ}/INV`, A.management, { number_source: 'app' })).body.sequences.find((x) => x.series === 'INV').number_source, 'app');
    });
    await test('NUMBER SOURCE "manual" applies to internal DC creation too: a typed number is required', async () => {
      const vendor = (await sql("INSERT INTO master_vendors (name, company_id) VALUES ($1, $2) RETURNING id", [`${tag} ms`, coA]))[0].id;
      const stock = await mkStock(coA, 'ManualSrc item');
      const project = (await sql('INSERT INTO projects (name, company_id, created_by) VALUES ($1, $2, $3) RETURNING id', [`${tag} PMS`, coA, A.project_manager.id]))[0].id;
      let n = 0;
      const item = async () => {
        n += 1;
        const req = (await sql(`INSERT INTO job_work_requests (job_id, project_id, company_id, job_work_type, store_incharge_id, created_by)
          VALUES ($1, $2, $3, 'Shot Blasting', $4, $5) RETURNING id`, [`${tag}-MS${n}`, project, coA, A.store_incharge.id, A.project_manager.id]))[0].id;
        return (await sql("INSERT INTO job_work_items (job_work_id, material_name, quantity, unit) VALUES ($1, 'p', 1, 'pcs') RETURNING id", [req]))[0].id;
      };
      const body = async (dc) => ({ vendor_id: vendor, ...(dc ? { dc_number: dc } : {}), items: [{ job_work_item_id: await item(), stock_item_id: stock, quantity: 1, unit_value: '5' }] });
      assert.equal((await call('PUT', `${SEQ}/DC`, A.management, { number_source: 'manual' })).status, 200);
      try {
        const missing = await call('POST', '/api/jobwork-dcs', A.store_incharge, await body());
        assert.equal(missing.status, 400);
        assert.match(missing.body.error, /from Tally/);
        const typed = await call('POST', '/api/jobwork-dcs', A.store_incharge, await body('TALLY-DC-0001'));
        assert.equal(typed.status, 201, JSON.stringify(typed.body));
        assert.equal(typed.body.dc.dc_number, 'TALLY-DC-0001');
      } finally {
        await call('PUT', `${SEQ}/DC`, A.management, { number_source: 'app' });
      }
      const auto = await call('POST', '/api/jobwork-dcs', A.store_incharge, await body());
      assert.equal(auto.status, 201, JSON.stringify(auto.body)); // back to automatic
      assert.match(auto.body.dc.dc_number, /^SE\/DC\/\d{4}$/);
    });

    await test('internal DC creation uses the shared series; a typed number is checked against the external dispatches too', async () => {
      const coD = A.store_incharge.company_id; // company A
      const vendor = (await sql("INSERT INTO master_vendors (name, company_id) VALUES ($1, $2) RETURNING id", [`${tag} dcv`, coD]))[0].id;
      const stock = await mkStock(coD, 'Internal item');
      const project = (await sql('INSERT INTO projects (name, company_id, created_by) VALUES ($1, $2, $3) RETURNING id', [`${tag} PI`, coD, A.project_manager.id]))[0].id;
      let n = 0;
      const mkItemRow = async () => {
        n += 1;
        const req = (await sql(`INSERT INTO job_work_requests (job_id, project_id, company_id, job_work_type, store_incharge_id, created_by)
          VALUES ($1, $2, $3, 'Shot Blasting', $4, $5) RETURNING id`, [`${tag}-JW${n}`, project, coD, A.store_incharge.id, A.project_manager.id]))[0].id;
        return (await sql("INSERT INTO job_work_items (job_work_id, material_name, quantity, unit) VALUES ($1, 'part', 2, 'pcs') RETURNING id", [req]))[0].id;
      };
      const body = (item, dc) => ({ vendor_id: vendor, ...(dc ? { dc_number: dc } : {}), items: [{ job_work_item_id: item, stock_item_id: stock, quantity: 2, unit_value: '10' }] });

      const first = await call('POST', '/api/jobwork-dcs', A.store_incharge, body(await mkItemRow()));
      assert.equal(first.status, 201, JSON.stringify(first.body));
      assert.match(first.body.dc.dc_number, /^SE\/DC\/\d{4}$/);
      const seq = (await sql("SELECT last_value FROM doc_sequences WHERE company_id = $1 AND series = 'DC'", [coD]))[0].last_value;
      assert.equal(first.body.dc.dc_number, `SE/DC/${String(seq).padStart(4, '0')}`); // it came from the shared counter

      // an external dispatch already holds SE/DC/7001: the internal screen must refuse it
      const cust = await mkCustomer(coD, 'DcOwner');
      const wo = await mkWo(coD, cust, 'SE/WO/DCX');
      await sql("INSERT INTO ejw_dispatches (company_id, wo_id, customer_id, customer_name, dc_no) VALUES ($1, $2, $3, 'X', 'SE/DC/7001')", [coD, wo, cust]);
      const clash = await call('POST', '/api/jobwork-dcs', A.store_incharge, body(await mkItemRow(), 'SE/DC/7001'));
      assert.equal(clash.status, 409);
      assert.match(clash.body.error, /already exists/);
      const free = await call('POST', '/api/jobwork-dcs', A.store_incharge, body(await mkItemRow(), 'SE/DC/7002'));
      assert.equal(free.status, 201);
      const edit = await call('PUT', `/api/jobwork-dcs/${free.body.dc.id}`, A.store_incharge, { dc_number: 'SE/DC/7001' });
      assert.equal(edit.status, 409);
      assert.equal((await call('PUT', `/api/jobwork-dcs/${free.body.dc.id}`, A.store_incharge, { dc_number: 'SE/DC/7002' })).status, 200); // keeping its own number is fine
    });
  } catch (err) {
    console.error('\nFatal:', err);
    process.exitCode = 1;
  } finally {
    await h.finish();
  }
})();
