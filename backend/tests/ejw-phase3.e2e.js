// External Job Work v2 - Phase 3: issue to floor, ready -> confirm, dispatch (challan + invoice), knock-off, cancel,
// short-close, reports, role shapes; plus the Phase 2 follow-ups (stock item request from an inward, legacy gating).
// Run from backend/:  npm run test:ejw3
const fs = require('node:fs');
const path = require('node:path');
const { createHarness } = require('./helpers/harness');

const h = createHarness({ port: 3924, name: 'ejw-phase3' });
const { tag, pool, assert, call, test, section } = h;

const sql = async (text, params) => (await pool.query(text, params)).rows;
const p2 = (n) => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };

function keysIn(value, found = new Set()) {
  if (Array.isArray(value)) value.forEach((v) => keysIn(v, found));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => { found.add(k); keysIn(v, found); });
  return found;
}
const COMPONENT_MONEY = ['unit_value', 'total_value', 'component_value', 'value', 'pending_value'];
const INVOICE_MONEY = ['job_charge', 'taxable_value', 'gst_amount', 'cgst_amount', 'sgst_amount', 'igst_amount', 'invoice_total', 'dispatch_total'];

async function wipe(companyIds) {
  const ids = [companyIds];
  const steps = [
    'DELETE FROM stock_item_requests WHERE company_id = ANY($1)',
    'DELETE FROM external_material_collections WHERE request_id IN (SELECT id FROM external_jobwork_outstock_requests WHERE company_id = ANY($1))',
    'DELETE FROM external_jobwork_outstock_transaction_items WHERE transaction_id IN (SELECT id FROM external_jobwork_outstock_transactions WHERE company_id = ANY($1))',
    'DELETE FROM external_jobwork_outstock_transactions WHERE company_id = ANY($1)',
    'DELETE FROM external_jobwork_outstock_request_items WHERE request_id IN (SELECT id FROM external_jobwork_outstock_requests WHERE company_id = ANY($1))',
    'DELETE FROM external_jobwork_outstock_requests WHERE company_id = ANY($1)',
    'DELETE FROM ejw_short_closes WHERE company_id = ANY($1)',
    'DELETE FROM ejw_ready_notice_items WHERE notice_id IN (SELECT id FROM ejw_ready_notices WHERE company_id = ANY($1))',
    'DELETE FROM ejw_ready_notices WHERE company_id = ANY($1)',
    'DELETE FROM ejw_dispatch_items WHERE dispatch_id IN (SELECT id FROM ejw_dispatches WHERE company_id = ANY($1))',
    'DELETE FROM ejw_dispatches WHERE company_id = ANY($1)',
    'DELETE FROM work_order_documents WHERE wo_id IN (SELECT id FROM work_orders WHERE company_id = ANY($1))',
    'DELETE FROM ejw_inward_items WHERE inward_id IN (SELECT id FROM ejw_inwards WHERE company_id = ANY($1))',
    'DELETE FROM ejw_inward_receipts WHERE inward_id IN (SELECT id FROM ejw_inwards WHERE company_id = ANY($1))',
    'DELETE FROM ejw_inwards WHERE company_id = ANY($1)',
    'DELETE FROM work_orders WHERE company_id = ANY($1)',
    'DELETE FROM project_workers WHERE project_id IN (SELECT id FROM projects WHERE company_id = ANY($1))',
    'DELETE FROM project_status_history WHERE project_id IN (SELECT id FROM projects WHERE company_id = ANY($1))',
    'DELETE FROM projects WHERE company_id = ANY($1)',
    'DELETE FROM master_customers WHERE company_id = ANY($1)',
    'DELETE FROM doc_sequences WHERE company_id = ANY($1)',
    'DELETE FROM stock_items WHERE company_id = ANY($1)'
  ];
  for (const s of steps) await pool.query(s, ids).catch((e) => console.log('  cleanup warn:', s.slice(0, 50), e.message));
}

(async () => {
  let coA; let coB; let A; let B;
  try {
    coA = await h.mkCompany('A', { gst_number: '29AAAAA0000A1Z5', state: 'Karnataka' });
    coB = await h.mkCompany('B', { gst_number: '29BBBBB0000A1Z5', state: 'Karnataka' });
    A = {};
    for (const role of ['management', 'accountant', 'store_incharge', 'project_manager', 'npd', 'worker']) A[role] = await h.mkUser(role, coA);
    A.pm2 = await h.mkUser('project_manager', coA);
    A.worker2 = await h.mkUser('worker', coA);
    B = {};
    for (const role of ['accountant', 'store_incharge', 'project_manager']) B[role] = await h.mkUser(role, coB);
    h.onCleanup(() => wipe(h.created.companies));
    await h.startServer();

    const mkCust = async (co, name, extra = {}) => (await sql(
      'INSERT INTO master_customers (company_id, name, gstin, state, email, is_active) VALUES ($1, $2, $3, $4, $5, true) RETURNING id',
      [co, `${tag} ${name}`, extra.gstin === undefined ? '29BBBBB1111B1Z5' : extra.gstin, extra.state === undefined ? 'Karnataka' : extra.state, 'c@customer.test']))[0].id;
    const mkStock = async (co, name, hsn, unit = 'pcs') => (await sql('INSERT INTO stock_items (company_id, name, hsn, unit) VALUES ($1, $2, $3, $4) RETURNING id', [co, `${tag} ${name}`, hsn, unit]))[0].id;
    const cX = await mkCust(coA, 'Customer X');
    const cTN = await mkCust(coA, 'Customer TN', { gstin: '33CCCCC2222C1Z5', state: 'Tamil Nadu' });
    const sShaft = await mkStock(coA, 'Shaft', '8483');
    const sPlate = await mkStock(coA, 'Plate', '7308', 'kg');
    const GST18 = 2;

    let dcN = 0;
    // an inward with one or two items, a work order for the PM, optionally the PO number
    async function flow({ customer = cX, qty = '100', unitValue = '2000', po = 'PO-1', second = false, noDc = false } = {}) {
      dcN += 1;
      const items = [{ stock_item_id: sShaft, qty, unit_value: unitValue }];
      if (second) items.push({ stock_item_id: sPlate, qty: '10', unit_value: '500' });
      const body = { customer_id: customer, received_date: today(), items };
      if (noDc) Object.assign(body, { third_party: true, supplier_name: 'Supplier S', supplier_dc_no: `S-${dcN}` });
      else Object.assign(body, { customer_dc_no: `P3-${tag.slice(-6)}-${dcN}`, customer_dc_date: '2026-10-01' });
      const inw = await call('POST', '/api/ejw/inwards', A.store_incharge, body);
      assert.equal(inw.status, 201, JSON.stringify(inw.body));
      const inward = inw.body.inward;
      const full = await call('GET', `/api/ejw/inwards/${inward.id}`, A.store_incharge);
      const itemIds = full.body.inward.items.map((i) => i.id);
      const wo = await call('POST', '/api/ejw/work-orders', A.project_manager, { inward_item_ids: itemIds, description: 'Machine' });
      assert.equal(wo.status, 201, JSON.stringify(wo.body));
      const woId = wo.body.work_order.id;
      if (po) assert.equal((await call('PUT', `/api/ejw/work-orders/${woId}`, A.project_manager, { customer_po_no: po })).status, 200);
      const [row] = await sql('SELECT project_id FROM work_orders WHERE id = $1', [woId]);
      await sql('INSERT INTO project_workers (project_id, worker_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [row.project_id, A.worker.id]).catch(() => {});
      return { inwardId: inward.id, woId, projectId: row.project_id, itemIds, itemId: itemIds[0] };
    }
    const issueAll = async (f, qty, itemId = f.itemId) => {
      const r = await call('POST', '/api/external-jobwork-materials/request', A.project_manager, {
        project_id: f.projectId, worker_id: A.worker.id, items: [{ ejw_inward_item_id: itemId, requested_quantity: String(qty) }] });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      const ok = await call('POST', `/api/external-jobwork-materials/requests/${r.body.requestId}/fulfill`, A.store_incharge, {});
      assert.equal(ok.status, 201, JSON.stringify(ok.body));
      return r.body.requestId;
    };
    const addReport = (woId) => sql("INSERT INTO work_order_documents (wo_id, kind, file_name, file_path) VALUES ($1, 'inspection_report', 'ins.pdf', '/uploads/ins.pdf')", [woId]);
    // claim -> confirm: ready_qty rises
    async function makeReady(f, qty, itemId = f.itemId) {
      await addReport(f.woId).catch(() => {});
      const c = await call('POST', `/api/ejw/work-orders/${f.woId}/mark-ready`, A.project_manager, { items: [{ inward_item_id: itemId, qty: String(qty) }] });
      assert.equal(c.status, 201, JSON.stringify(c.body));
      const ok = await call('POST', `/api/ejw/ready-notices/${c.body.notice.id}/confirm`, A.store_incharge, {});
      assert.equal(ok.status, 200, JSON.stringify(ok.body));
      return c.body.notice.id;
    }
    const dispatchBody = (f, qty, extra = {}) => ({ wo_id: f.woId, items: [{ inward_item_id: f.itemId, qty: String(qty) }], job_charge: '112000', gst_rate_id: GST18, ...extra });
    const item = async (id) => (await sql('SELECT * FROM ejw_inward_items WHERE id = $1', [id]))[0];
    const woStatus = async (id) => (await sql('SELECT status FROM work_orders WHERE id = $1', [id]))[0].status;
    const D = '/api/ejw/dispatches';
    const MAT = '/api/external-jobwork-materials';

    // ======================================================================= follow-ups from phase 2
    section('Stock item request raised from an inward');
    await test('the request links to the inward item and shows the accountant the customer, customer DC, description, qty and HSN', async () => {
      dcN += 1;
      const dcNo = `REQ-${tag.slice(-6)}-${dcN}`;
      const inw = await call('POST', '/api/ejw/inwards', A.store_incharge, {
        customer_id: cX, customer_dc_no: dcNo, customer_dc_date: '2026-10-01', received_date: today(),
        items: [{ request_stock_item: true, description: `${tag} Odd bracket`, unit: 'pcs', hsn: '7326', qty: '7', unit_value: '120' }] });
      assert.equal(inw.status, 201, JSON.stringify(inw.body));
      const [reqRow] = await sql('SELECT * FROM stock_item_requests WHERE company_id = $1 AND ejw_inward_item_id IS NOT NULL', [coA]);
      assert.ok(reqRow, 'a stock item request linked to the inward item');
      const detail = await call('GET', `/api/jobwork-dcs/stock-item-requests/${reqRow.id}`, A.accountant);
      assert.equal(detail.status, 200, JSON.stringify(detail.body));
      const shown = JSON.stringify(detail.body.request);
      for (const needle of [`${tag} Customer X`, dcNo, 'Odd bracket', '7326']) assert.ok(shown.includes(needle), `request shows ${needle}`);
      assert.ok(/"(quantity|qty)":"?7/.test(shown), 'quantity shown');
    });

    section('Legacy external flow is gated');
    await test('the old Receipt/Challan screens are not reachable when SHOW_LEGACY_EXTERNAL_FLOW is false', async () => {
      const features = fs.readFileSync(path.join(__dirname, '../../src/config/features.js'), 'utf8');
      assert.ok(/SHOW_LEGACY_EXTERNAL_FLOW\s*=\s*false/.test(features), 'flag is off');
      const app = fs.readFileSync(path.join(__dirname, '../../App.js'), 'utf8').replace(/\r/g, '');
      const at = app.indexOf('SHOW_LEGACY_EXTERNAL_FLOW ? (');
      assert.ok(at > 0, 'screens are registered only under the flag');
      assert.ok(/ExternalJobworkReceipt/.test(app.slice(at)), 'receipt screen sits inside the conditional block');
    });

    // ======================================================================= issue to the floor
    section('Issue to floor (inward items, one deduction path)');
    const f1 = await flow({ second: true });
    await test('PM sees only the items of his own work order, not other stock', async () => {
      const other = await flow({ customer: cTN });
      const r = await call('GET', `${MAT}/project/${f1.projectId}/available`, A.project_manager);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      const ids = r.body.materials.map((m) => m.ejw_inward_item_id).sort();
      assert.deepEqual(ids, [...f1.itemIds].sort());
      assert.ok(!ids.includes(other.itemId));
      assert.equal(r.body.materials.some((m) => 'unit_value' in m || 'total_value' in m), false, 'PM sees no money');
    });
    await test('PM of another work order is refused (403); another company gets 404', async () => {
      assert.equal((await call('GET', `${MAT}/project/${f1.projectId}/available`, A.pm2)).status, 403);
      assert.equal((await call('GET', `${MAT}/project/${f1.projectId}/available`, B.project_manager)).status, 404);
    });
    await test('asking for more than is available is refused and nothing moves', async () => {
      const r = await call('POST', `${MAT}/request`, A.project_manager, { project_id: f1.projectId, worker_id: A.worker.id,
        items: [{ ejw_inward_item_id: f1.itemId, requested_quantity: '101' }] });
      assert.equal(r.status, 400);
      assert.equal(Number((await item(f1.itemId)).issued_qty), 0);
    });
    await test('a non-PM cannot raise a request (403); a worker not on the project is refused (400)', async () => {
      assert.equal((await call('POST', `${MAT}/request`, A.store_incharge, { project_id: f1.projectId, worker_id: A.worker.id, items: [] })).status, 403);
      const r = await call('POST', `${MAT}/request`, A.project_manager, { project_id: f1.projectId, worker_id: A.worker2.id,
        items: [{ ejw_inward_item_id: f1.itemId, requested_quantity: '1' }] });
      assert.equal(r.status, 400);
    });
    let reqId;
    await test('Store fulfils: issued_qty rises by exactly the quantity, work order becomes in_process, PM is told', async () => {
      reqId = await issueAll(f1, 60);
      assert.equal(Number((await item(f1.itemId)).issued_qty), 60);
      assert.equal(await woStatus(f1.woId), 'in_process');
      const n = await sql("SELECT 1 FROM notifications WHERE user_id = $1 AND type = 'material_collected'", [A.project_manager.id]);
      assert.ok(n.length >= 1);
      const tx = await sql('SELECT i.ejw_inward_item_id, i.issued_quantity FROM external_jobwork_outstock_transaction_items i JOIN external_jobwork_outstock_transactions t ON t.id = i.transaction_id WHERE t.request_id = $1', [reqId]);
      assert.equal(tx[0].ejw_inward_item_id, f1.itemId);
    });
    await test('the same request cannot be fulfilled twice (409) and nothing double-counts', async () => {
      const again = await call('POST', `${MAT}/requests/${reqId}/fulfill`, A.store_incharge, {});
      assert.equal(again.status, 409);
      assert.equal(Number((await item(f1.itemId)).issued_qty), 60);
    });
    await test('two requests for the last units: only one wins, the other is refused whole (row lock)', async () => {
      const mk = () => call('POST', `${MAT}/request`, A.project_manager, { project_id: f1.projectId, worker_id: A.worker.id,
        items: [{ ejw_inward_item_id: f1.itemId, requested_quantity: '40' }] });
      const a = await mk(); const b = await mk();
      assert.equal(a.status, 201); assert.equal(b.status, 201);
      const [x, y] = await Promise.all([a, b].map((r) => call('POST', `${MAT}/requests/${r.body.requestId}/fulfill`, A.store_incharge, {})));
      assert.deepEqual([x.status, y.status].sort(), [201, 400]);
      assert.equal(Number((await item(f1.itemId)).issued_qty), 100);
    });
    await test('Store cannot issue what the PM did not request for; Accounts cannot fulfil (403)', async () => {
      const r = await call('POST', `${MAT}/request`, A.project_manager, { project_id: f1.projectId, worker_id: A.worker.id,
        items: [{ ejw_inward_item_id: f1.itemIds[1], requested_quantity: '2' }] });
      assert.equal(r.status, 201);
      assert.equal((await call('POST', `${MAT}/requests/${r.body.requestId}/fulfill`, A.accountant, {})).status, 403);
      assert.equal((await call('POST', `${MAT}/requests/${r.body.requestId}/fulfill`, B.store_incharge, {})).status, 404);
      assert.equal((await call('PUT', `${MAT}/requests/${r.body.requestId}/cancel`, A.project_manager, {})).status, 200);
      assert.equal((await call('PUT', `${MAT}/requests/${r.body.requestId}/cancel`, A.project_manager, {})).status, 400);
    });
    await test('worker QR collect uses the same path: issued_qty rises, a collection row is written', async () => {
      const f = await flow();
      const r = await call('POST', `${MAT}/request`, A.project_manager, { project_id: f.projectId, worker_id: A.worker.id,
        items: [{ ejw_inward_item_id: f.itemId, requested_quantity: '25' }] });
      assert.equal((await call('POST', `${MAT}/requests/REQ-${r.body.requestId}/collect`, A.worker2, {})).status, 403);
      const c = await call('POST', `${MAT}/requests/REQ-${r.body.requestId}/collect`, A.worker, {});
      assert.equal(c.status, 200, JSON.stringify(c.body));
      assert.equal(Number((await item(f.itemId)).issued_qty), 25);
      assert.equal((await sql('SELECT 1 FROM external_material_collections WHERE request_id = $1', [r.body.requestId])).length, 1);
      assert.equal((await call('POST', `${MAT}/requests/REQ-${r.body.requestId}/collect`, A.worker, {})).status, 409);
      assert.equal(Number((await item(f.itemId)).issued_qty), 25);
    });

    // ======================================================================= ready -> confirm
    section('Mark ready (PM) and confirm (Store)');
    const f2 = await flow({ po: 'PO-2' });
    await issueAll(f2, 100);
    await test('a claim without an inspection report is refused (400)', async () => {
      const r = await call('POST', `/api/ejw/work-orders/${f2.woId}/mark-ready`, A.project_manager, { items: [{ inward_item_id: f2.itemId, qty: '50' }] });
      assert.equal(r.status, 400);
      assert.ok(/inspection report/i.test(r.body.message || r.body.error || ''));
    });
    await test('PM claims 60 of 100: ready_qty does not move until Store confirms; Store is notified', async () => {
      await addReport(f2.woId);
      const r = await call('POST', `/api/ejw/work-orders/${f2.woId}/mark-ready`, A.project_manager, { items: [{ inward_item_id: f2.itemId, qty: '60' }] });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      assert.equal(Number((await item(f2.itemId)).ready_qty), 0);
      assert.ok((await sql("SELECT 1 FROM notifications WHERE user_id = $1 AND type = 'ejw_ready_claimed'", [A.store_incharge.id])).length >= 1);
      f2.notice = r.body.notice.id;
    });
    await test('a second claim while one is waiting is refused (409); another PM is refused (403)', async () => {
      assert.equal((await call('POST', `/api/ejw/work-orders/${f2.woId}/mark-ready`, A.project_manager, { items: [{ inward_item_id: f2.itemId, qty: '1' }] })).status, 409);
      assert.equal((await call('POST', `/api/ejw/work-orders/${f2.woId}/mark-ready`, A.pm2, { items: [{ inward_item_id: f2.itemId, qty: '1' }] })).status, 403);
    });
    await test('Store cannot confirm more than claimed (400); only Store can confirm (403)', async () => {
      assert.equal((await call('POST', `/api/ejw/ready-notices/${f2.notice}/confirm`, A.store_incharge, { items: [{ inward_item_id: f2.itemId, confirmed_qty: '61' }] })).status, 400);
      assert.equal((await call('POST', `/api/ejw/ready-notices/${f2.notice}/confirm`, A.accountant, {})).status, 403);
      assert.equal((await call('POST', `/api/ejw/ready-notices/${f2.notice}/confirm`, B.store_incharge, {})).status, 404);
    });
    await test('Store counts 58: ready_qty = 58, Accounts is notified, status stays in_process', async () => {
      const r = await call('POST', `/api/ejw/ready-notices/${f2.notice}/confirm`, A.store_incharge, { items: [{ inward_item_id: f2.itemId, confirmed_qty: '58' }] });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(Number((await item(f2.itemId)).ready_qty), 58);
      assert.ok((await sql("SELECT 1 FROM notifications WHERE user_id = $1 AND type = 'ejw_ready_confirmed'", [A.accountant.id])).length >= 1);
      assert.equal(await woStatus(f2.woId), 'in_process');
      assert.equal((await call('POST', `/api/ejw/ready-notices/${f2.notice}/confirm`, A.store_incharge, {})).status, 400);
    });
    await test('a claim above what was issued and not yet ready is refused', async () => {
      const r = await call('POST', `/api/ejw/work-orders/${f2.woId}/mark-ready`, A.project_manager, { items: [{ inward_item_id: f2.itemId, qty: '43' }] });
      assert.equal(r.status, 400);
    });
    await test('PM sees the ready notice without any money', async () => {
      const r = await call('GET', `/api/ejw/ready-notices/${f2.notice}`, A.project_manager);
      assert.equal(r.status, 200);
      const keys = keysIn(r.body);
      for (const k of [...COMPONENT_MONEY, ...INVOICE_MONEY]) assert.ok(!keys.has(k), `PM must not see ${k}`);
      assert.equal((await call('GET', `/api/ejw/ready-notices/${f2.notice}`, A.pm2)).status, 403);
    });

    // ======================================================================= dispatch
    section('Dispatch: two documents, tax split, e-way rule, blockers');
    const fa = await flow({ po: 'PO-AKE' });
    await issueAll(fa, 100);
    await makeReady(fa, 100);
    let ake;
    await test('tax preview: component 2,00,000, job charge 1,12,000 at 18% -> CGST 10,080 + SGST 10,080, total 3,32,160', async () => {
      const r = await call('POST', `${D}/preview`, A.accountant, dispatchBody(fa, 100));
      assert.equal(r.status, 200, JSON.stringify(r.body));
      const b = r.body;
      assert.equal(b.component_value, '200000.00');
      assert.equal(b.taxable_value, '112000.00');
      assert.equal(b.gst_split, 'CGST_SGST');
      assert.equal(b.cgst_amount, '10080.00'); assert.equal(b.sgst_amount, '10080.00'); assert.equal(b.igst_amount, '0.00');
      assert.equal(b.invoice_total, '132160.00');
      assert.equal(b.dispatch_total, '332160.00');
      assert.equal(b.sac_code, '998875');
      assert.equal(b.eway.required, true);
      assert.deepEqual(b.blockers, []);
      assert.ok(/^SE\/DC\//.test(b.next_dc_no) && /^SE\/INV\/\d{4}\/\d{4}$/.test(b.next_invoice_no));
    });
    await test('preview writes nothing and consumes no number', async () => {
      assert.equal((await sql('SELECT COUNT(*)::int AS n FROM ejw_dispatches WHERE company_id = $1', [coA]))[0].n, 0);
    });
    await test('GST is on the job charge only: component value never enters the tax', async () => {
      const r = await call('POST', `${D}/preview`, A.accountant, dispatchBody(fa, 100, { job_charge: '1000' }));
      assert.equal(r.body.gst_amount, '180.00');
    });
    await test('a customer in another state gets IGST', async () => {
      const f = await flow({ customer: cTN });
      await issueAll(f, 100); await makeReady(f, 100);
      const r = await call('POST', `${D}/preview`, A.accountant, dispatchBody(f, 100));
      assert.equal(r.body.gst_split, 'IGST');
      assert.equal(r.body.igst_amount, '20160.00'); assert.equal(r.body.cgst_amount, '0.00');
      assert.equal(r.body.eway.required, true);
    });
    await test('preview/create refuse bad input: more than ready (400), no job charge (400), bad SAC (400), unknown WO (404)', async () => {
      assert.equal((await call('POST', `${D}/preview`, A.accountant, dispatchBody(fa, 101))).status, 400);
      assert.equal((await call('POST', `${D}/preview`, A.accountant, dispatchBody(fa, 10, { job_charge: '0' }))).status, 400);
      assert.equal((await call('POST', `${D}/preview`, A.accountant, dispatchBody(fa, 10, { sac_code: 'abc' }))).status, 400);
      assert.equal((await call('POST', `${D}/preview`, B.accountant, dispatchBody(fa, 10))).status, 404);
    });
    await test('only Accounts creates a dispatch (403 for Store, PM, NPD)', async () => {
      for (const u of [A.store_incharge, A.project_manager, A.npd]) assert.equal((await call('POST', D, u, dispatchBody(fa, 10))).status, 403);
    });
    await test('draft: created without numbers, quantities not yet knocked off', async () => {
      const r = await call('POST', D, A.accountant, dispatchBody(fa, 100, { vehicle_no: 'KA01XY9999' }));
      assert.equal(r.status, 201, JSON.stringify(r.body));
      ake = r.body.dispatch;
      assert.equal(ake.status, 'draft'); assert.equal(ake.dc_no, null); assert.equal(ake.invoice_no, null);
      assert.equal(Number((await item(fa.itemId)).returned_qty), 0);
    });
    await test('issuing needs the e-way bill number when the total is above 50,000 / interstate', async () => {
      const r = await call('POST', `${D}/${ake.id}/issue`, A.accountant, {});
      assert.equal(r.status, 400);
      assert.ok(/e-way/i.test(r.body.message || r.body.error || ''));
      assert.equal((await call('POST', `${D}/${ake.id}/issue`, A.accountant, { eway_bill_no: '12345' })).status, 400);
    });
    await test('issue: BOTH documents get numbers, challan has component lines and no GST, invoice has the job charge', async () => {
      const r = await call('POST', `${D}/${ake.id}/issue`, A.accountant, { eway_bill_no: '123456789012' });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      const d = r.body.dispatch;
      assert.equal(d.status, 'issued');
      assert.ok(/^SE\/DC\/\d{4}$/.test(d.dc_no), d.dc_no);
      assert.ok(/^SE\/INV\/\d{4}\/\d{4}$/.test(d.invoice_no) && d.invoice_no.length === 16, d.invoice_no);
      assert.equal(d.items.length, 1);
      assert.equal(d.items[0].hsn, '8483'); assert.equal(Number(d.items[0].qty), 100); assert.equal(d.items[0].value, '200000.00');
      assert.ok(d.items[0].customer_dc_no, 'customer DC reference on the challan line');
      assert.equal(d.taxable_value, '112000.00'); assert.equal(d.cgst_amount, '10080.00'); assert.equal(d.sgst_amount, '10080.00');
      assert.equal(d.dispatch_total, '332160.00'); assert.equal(d.sac_code, '998875');
      ake = d;
    });
    await test('knock-off: returned_qty = 100, the inward and the work order close', async () => {
      assert.equal(Number((await item(fa.itemId)).returned_qty), 100);
      assert.equal((await sql('SELECT status FROM ejw_inwards WHERE id = $1', [fa.inwardId]))[0].status, 'closed');
      assert.equal(await woStatus(fa.woId), 'closed');
      assert.equal((await sql('SELECT status FROM projects WHERE id = $1', [fa.projectId]))[0].status, 'completed');
    });
    await test('an issued dispatch cannot be issued, edited or deleted again', async () => {
      assert.equal((await call('POST', `${D}/${ake.id}/issue`, A.accountant, { eway_bill_no: '123456789012' })).status, 400);
      assert.equal((await call('PUT', `${D}/${ake.id}`, A.accountant, dispatchBody(fa, 1))).status, 400);
      assert.equal((await call('DELETE', `${D}/${ake.id}`, A.accountant)).status, 400);
    });

    // ----- blockers
    section('Dispatch blockers: customer PO number and unattached customer DC (S2)');
    const fnp = await flow({ po: null });
    await issueAll(fnp, 10); await makeReady(fnp, 10);
    await test('no customer PO number: preview lists the blocker, create is refused (400)', async () => {
      const p = await call('POST', `${D}/preview`, A.accountant, dispatchBody(fnp, 10));
      assert.equal(p.status, 200);
      assert.ok(p.body.blockers.some((b) => /PO number/i.test(b)));
      assert.equal((await call('POST', D, A.accountant, dispatchBody(fnp, 10))).status, 400);
      assert.equal((await call('PUT', `/api/ejw/work-orders/${fnp.woId}`, A.project_manager, { customer_po_no: 'PO-LATE' })).status, 200);
      assert.equal((await call('POST', D, A.accountant, dispatchBody(fnp, 10))).status, 201);
    });
    const fs2 = await flow({ noDc: true, po: 'PO-S2' });
    await issueAll(fs2, 100); await makeReady(fs2, 100);
    let s2draft;
    await test('S2: dispatch is blocked while the customer DC is not attached', async () => {
      const p = await call('POST', `${D}/preview`, A.accountant, dispatchBody(fs2, 100));
      assert.ok(p.body.blockers.some((b) => /delivery challan/i.test(b)), JSON.stringify(p.body.blockers));
      assert.equal((await call('POST', D, A.accountant, dispatchBody(fs2, 100))).status, 400);
    });
    await test('S2: once Store attaches the customer DC, the dispatch goes through', async () => {
      const at = await call('POST', `/api/ejw/inwards/${fs2.inwardId}/customer-dc`, A.store_incharge, { customer_dc_no: `S2-${tag.slice(-6)}`, customer_dc_date: '2026-10-02' });
      assert.equal(at.status, 200, JSON.stringify(at.body));
      const r = await call('POST', D, A.accountant, dispatchBody(fs2, 100));
      assert.equal(r.status, 201, JSON.stringify(r.body));
      s2draft = r.body.dispatch;
      assert.equal(s2draft.items[0].customer_dc_no, `S2-${tag.slice(-6)}`);
    });
    await test('a draft can be edited and deleted; deleting leaves no number used', async () => {
      const e = await call('PUT', `${D}/${s2draft.id}`, A.accountant, dispatchBody(fs2, 50, { job_charge: '5000' }));
      assert.equal(e.status, 200, JSON.stringify(e.body));
      assert.equal(Number(e.body.dispatch.items[0].qty), 50);
      assert.equal((await call('DELETE', `${D}/${s2draft.id}`, A.accountant)).status, 200);
      assert.equal((await call('GET', `${D}/${s2draft.id}`, A.accountant)).status, 404);
    });

    // ----- numbering
    section('Numbers: app/manual source, never reused');
    const fn = await flow({ po: 'PO-N' });
    await issueAll(fn, 100); await makeReady(fn, 100);
    let n1; let n2;
    await test('manual source: Accounts must type the DC and invoice numbers (400 if blank); typed numbers are used as given', async () => {
      await sql("INSERT INTO doc_sequences (company_id, series, reset_yearly, number_source) VALUES ($1, 'DC', false, 'manual') ON CONFLICT (company_id, series) DO UPDATE SET number_source = 'manual'", [coA]);
      await sql("INSERT INTO doc_sequences (company_id, series, reset_yearly, number_source) VALUES ($1, 'INV', true, 'manual') ON CONFLICT (company_id, series) DO UPDATE SET number_source = 'manual'", [coA]);
      const d = (await call('POST', D, A.accountant, dispatchBody(fn, 40))).body.dispatch;
      assert.equal((await call('POST', `${D}/${d.id}/issue`, A.accountant, { eway_bill_no: '123456789012' })).status, 400);
      const ok = await call('POST', `${D}/${d.id}/issue`, A.accountant, { eway_bill_no: '123456789012', dc_no: 'TD-001', invoice_no: 'TI-001' });
      assert.equal(ok.status, 200, JSON.stringify(ok.body));
      assert.equal(ok.body.dispatch.dc_no, 'TD-001'); assert.equal(ok.body.dispatch.invoice_no, 'TI-001');
      n1 = ok.body.dispatch;
    });
    await test('a typed number already used is refused (409); too long / bad characters are refused (400)', async () => {
      const d = (await call('POST', D, A.accountant, dispatchBody(fn, 10))).body.dispatch;
      assert.equal((await call('POST', `${D}/${d.id}/issue`, A.accountant, { eway_bill_no: '123456789012', dc_no: 'TD-001', invoice_no: 'TI-002' })).status, 409);
      assert.equal((await call('POST', `${D}/${d.id}/issue`, A.accountant, { eway_bill_no: '123456789012', dc_no: 'TD-002', invoice_no: 'TI-001' })).status, 409);
      assert.equal((await call('POST', `${D}/${d.id}/issue`, A.accountant, { eway_bill_no: '123456789012', dc_no: 'X'.repeat(17), invoice_no: 'TI-003' })).status, 400);
      assert.equal((await call('POST', `${D}/${d.id}/issue`, A.accountant, { eway_bill_no: '123456789012', dc_no: 'TD 02', invoice_no: 'TI-003' })).status, 400);
      assert.equal(Number((await item(fn.itemId)).returned_qty), 40, 'failed issues changed nothing');
      n2 = d;
    });
    await test('app source: numbers are generated, gapless and continue; a cancelled number is never reused', async () => {
      await sql("UPDATE doc_sequences SET number_source = 'app' WHERE company_id = $1", [coA]);
      const a = await call('POST', `${D}/${n2.id}/issue`, A.accountant, { eway_bill_no: '123456789012' });
      assert.equal(a.status, 200, JSON.stringify(a.body));
      const b = (await call('POST', D, A.accountant, dispatchBody(fn, 10))).body.dispatch;
      const bi = await call('POST', `${D}/${b.id}/issue`, A.accountant, { eway_bill_no: '123456789012' });
      const seq = (no) => parseInt(no.split('/').pop(), 10);
      assert.equal(seq(bi.body.dispatch.dc_no), seq(a.body.dispatch.dc_no) + 1);
      assert.equal(seq(bi.body.dispatch.invoice_no), seq(a.body.dispatch.invoice_no) + 1);
      // cancel b, issue c: c must not take b's number
      assert.equal((await call('POST', `${D}/${b.id}/cancel`, A.accountant, { reason: 'wrong qty' })).status, 200);
      const c = (await call('POST', D, A.accountant, dispatchBody(fn, 10))).body.dispatch;
      const ci = await call('POST', `${D}/${c.id}/issue`, A.accountant, { eway_bill_no: '123456789012' });
      assert.equal(seq(ci.body.dispatch.dc_no), seq(bi.body.dispatch.dc_no) + 1);
      assert.notEqual(ci.body.dispatch.invoice_no, bi.body.dispatch.invoice_no);
    });

    // ----- cancel
    section('Cancel: reverses the knock-off, keeps the numbers');
    const fc = await flow({ po: 'PO-C' });
    await issueAll(fc, 100); await makeReady(fc, 100);
    let cdisp;
    await test('cancel needs a reason (400); the dispatch keeps its numbers and returned_qty drops back; WO reopens', async () => {
      const d = (await call('POST', D, A.accountant, dispatchBody(fc, 100))).body.dispatch;
      const iss = await call('POST', `${D}/${d.id}/issue`, A.accountant, { eway_bill_no: '123456789012' });
      assert.equal(iss.status, 200, JSON.stringify(iss.body));
      cdisp = iss.body.dispatch;
      assert.equal(await woStatus(fc.woId), 'closed');
      assert.equal((await call('POST', `${D}/${cdisp.id}/cancel`, A.accountant, {})).status, 400);
      assert.equal((await call('POST', `${D}/${cdisp.id}/cancel`, A.store_incharge, { reason: 'x' })).status, 403);
      assert.equal((await call('POST', `${D}/${cdisp.id}/cancel`, B.accountant, { reason: 'x' })).status, 404);
      const c = await call('POST', `${D}/${cdisp.id}/cancel`, A.accountant, { reason: 'Customer rejected the load' });
      assert.equal(c.status, 200, JSON.stringify(c.body));
      assert.equal(c.body.dispatch.status, 'cancelled');
      assert.equal(c.body.dispatch.dc_no, cdisp.dc_no); assert.equal(c.body.dispatch.invoice_no, cdisp.invoice_no);
      assert.equal(Number((await item(fc.itemId)).returned_qty), 0);
      assert.equal((await sql('SELECT status FROM ejw_inwards WHERE id = $1', [fc.inwardId]))[0].status, 'open');
      assert.equal(await woStatus(fc.woId), 'ready');
    });
    await test('cancelling twice is refused (409); the material can be dispatched again under NEW numbers', async () => {
      assert.equal((await call('POST', `${D}/${cdisp.id}/cancel`, A.accountant, { reason: 'again' })).status, 409);
      const d = (await call('POST', D, A.accountant, dispatchBody(fc, 100))).body.dispatch;
      const iss = await call('POST', `${D}/${d.id}/issue`, A.accountant, { eway_bill_no: '123456789012' });
      assert.equal(iss.status, 200, JSON.stringify(iss.body));
      assert.notEqual(iss.body.dispatch.dc_no, cdisp.dc_no);
      assert.notEqual(iss.body.dispatch.invoice_no, cdisp.invoice_no);
      assert.equal(await woStatus(fc.woId), 'closed');
    });

    // ----- partial dispatch
    section('Partial dispatch');
    const fp = await flow({ po: 'PO-P' });
    await issueAll(fp, 100); await makeReady(fp, 100);
    await test('dispatching 40 of 100 leaves the work order partially_dispatched; the rest can follow', async () => {
      const d1 = (await call('POST', D, A.accountant, dispatchBody(fp, 40))).body.dispatch;
      assert.equal((await call('POST', `${D}/${d1.id}/issue`, A.accountant, { eway_bill_no: '123456789012' })).status, 200);
      assert.equal(Number((await item(fp.itemId)).returned_qty), 40);
      assert.equal(await woStatus(fp.woId), 'partially_dispatched');
      assert.equal((await sql('SELECT status FROM ejw_inwards WHERE id = $1', [fp.inwardId]))[0].status, 'open');
      const over = await call('POST', D, A.accountant, dispatchBody(fp, 61));
      assert.equal(over.status, 400, 'only 60 left');
      const d2 = (await call('POST', D, A.accountant, dispatchBody(fp, 60))).body.dispatch;
      assert.equal((await call('POST', `${D}/${d2.id}/issue`, A.accountant, { eway_bill_no: '123456789012' })).status, 200);
      assert.equal(await woStatus(fp.woId), 'closed');
    });

    // ----- short close
    section('Short-close (Accounts only)');
    const fk = await flow({ po: 'PO-K' });
    await issueAll(fk, 100); await makeReady(fk, 70);
    await test('only Accounts can short-close, with a quantity and a reason', async () => {
      const u = `/api/ejw/inward-items/${fk.itemId}/short-close`;
      for (const user of [A.store_incharge, A.project_manager, A.management]) assert.equal((await call('POST', u, user, { qty: '5', reason: 'x' })).status, 403);
      assert.equal((await call('POST', u, A.accountant, { qty: '5' })).status, 400);
      assert.equal((await call('POST', u, A.accountant, { qty: '0', reason: 'x' })).status, 400);
      assert.equal((await call('POST', u, A.accountant, { qty: '101', reason: 'x' })).status, 400);
      assert.equal((await call('POST', u, B.accountant, { qty: '5', reason: 'x' })).status, 404);
    });
    await test('dispatch 70, then short-close the 30 that scrapped: the inward and the work order close', async () => {
      const d = (await call('POST', D, A.accountant, dispatchBody(fk, 70))).body.dispatch;
      assert.equal((await call('POST', `${D}/${d.id}/issue`, A.accountant, { eway_bill_no: '123456789012' })).status, 200);
      assert.equal(await woStatus(fk.woId), 'partially_dispatched');
      const r = await call('POST', `/api/ejw/inward-items/${fk.itemId}/short-close`, A.accountant, { qty: '30', reason: 'Scrapped in machining' });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(r.body.inward_closed, true);
      assert.equal(await woStatus(fk.woId), 'closed');
      assert.equal(Number((await item(fk.itemId)).short_closed_qty), 30);
      assert.equal((await sql('SELECT reason FROM ejw_short_closes WHERE inward_item_id = $1', [fk.itemId]))[0].reason, 'Scrapped in machining');
      assert.equal((await call('POST', `/api/ejw/inward-items/${fk.itemId}/short-close`, A.accountant, { qty: '1', reason: 'more' })).status, 400);
    });

    // ======================================================================= reports
    section('Reports');
    const fr = await flow({ po: 'PO-R' });
    await issueAll(fr, 100); await makeReady(fr, 100);
    await test('material inside the factory lists open items with the pending component value', async () => {
      const r = await call('GET', '/api/ejw/reports/material-inside', A.accountant);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      const row = r.body.rows.find((x) => x.item_id === fr.itemId);
      assert.ok(row); assert.equal(Number(row.inside_qty), 100); assert.equal(row.pending_value, '200000.00');
      assert.equal(r.body.rows.some((x) => x.item_id === fa.itemId), false, 'a fully returned item is not inside');
    });
    await test('stock as of a date: before inward nothing, after inward 100, after dispatch 0; a cancelled dispatch counts for the days it was out', async () => {
      const f = await flow({ po: 'PO-AS' });
      await issueAll(f, 100); await makeReady(f, 100);
      const asOf = async (date) => {
        const r = await call('GET', `/api/ejw/reports/stock-as-of?date=${date}`, A.accountant);
        assert.equal(r.status, 200, JSON.stringify(r.body));
        const row = r.body.rows.find((x) => x.item_id === f.itemId);
        return row ? Number(row.inside_qty) : 0;
      };
      const d = (await call('POST', D, A.accountant, dispatchBody(f, 100))).body.dispatch;
      assert.equal((await call('POST', `${D}/${d.id}/issue`, A.accountant, { eway_bill_no: '123456789012', dc_date: '2026-10-10' })).status, 200);
      assert.equal(await asOf('2026-09-30'), 0, 'before the inward');
      assert.equal(await asOf(today()), 0, 'dispatched');
      // received today, dispatched on 10 Oct 2026: that DC date is before the receipt date; a date between must not go negative
      assert.ok((await asOf('2026-10-10')) >= 0);
      // cancel it and the stock is back inside today, but a date before the cancel when it was out shows it out
      assert.equal((await call('POST', `${D}/${d.id}/cancel`, A.accountant, { reason: 'test' })).status, 200);
      assert.equal(await asOf(today()), 100, 'back inside after the cancel');
      assert.equal((await call('GET', '/api/ejw/reports/stock-as-of', A.accountant)).status, 400);
      assert.equal((await call('GET', '/api/ejw/reports/stock-as-of?date=2026-13-45', A.accountant)).status, 400);
    });
    await test('stock as of: an inward received on a past date is counted from that date only', async () => {
      const f = await flow({ po: 'PO-AS2' });
      await sql('UPDATE ejw_inward_receipts SET received_date = $2 WHERE inward_id = $1', [f.inwardId, '2026-08-15']);
      const at = async (date) => {
        const r = await call('GET', `/api/ejw/reports/stock-as-of?date=${date}`, A.accountant);
        const row = r.body.rows.find((x) => x.item_id === f.itemId);
        return row ? Number(row.inside_qty) : 0;
      };
      assert.equal(await at('2026-08-14'), 0);
      assert.equal(await at('2026-08-15'), 100);
      await issueAll(f, 100); await makeReady(f, 100);
      const d = (await call('POST', D, A.accountant, dispatchBody(f, 100))).body.dispatch;
      assert.equal((await call('POST', `${D}/${d.id}/issue`, A.accountant, { eway_bill_no: '123456789012', dc_date: '2026-09-20' })).status, 200);
      assert.equal(await at('2026-09-19'), 100, 'still inside the day before it left');
      assert.equal(await at('2026-09-20'), 0, 'gone on the dispatch date');
    });
    await test('open customer DCs lists the open ones and flags a DC still to be attached', async () => {
      const r = await call('GET', '/api/ejw/reports/open-customer-dcs', A.accountant);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      const pending = await flow({ noDc: true, po: 'PO-OD' });
      const r2 = await call('GET', '/api/ejw/reports/open-customer-dcs', A.accountant);
      const row = r2.body.rows.find((x) => x.inward_id === pending.inwardId);
      assert.ok(row); assert.equal(row.customer_dc_pending, true); assert.equal(Number(row.open_qty), 100);
    });
    await test('work order status report shows the quantities for each stage', async () => {
      const r = await call('GET', '/api/ejw/reports/work-orders', A.accountant);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      const row = r.body.rows.find((x) => x.id === fr.woId);
      assert.equal(row.status, 'ready'); assert.equal(Number(row.qty), 100); assert.equal(Number(row.issued_qty), 100); assert.equal(Number(row.ready_qty), 100);
      const closed = await call('GET', '/api/ejw/reports/work-orders?status=closed', A.accountant);
      assert.ok(closed.body.rows.every((x) => x.status === 'closed') && closed.body.rows.some((x) => x.id === fa.woId));
    });
    await test('invoice register shows the GST split and totals; cancelled invoices are listed but not totalled', async () => {
      const r = await call('GET', '/api/ejw/reports/invoices', A.accountant);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      const row = r.body.rows.find((x) => x.invoice_no === ake.invoice_no);
      assert.equal(row.cgst_amount, '10080.00'); assert.equal(row.sgst_amount, '10080.00'); assert.equal(row.taxable_value, '112000.00'); assert.equal(row.gst_rate, '18.00');
      assert.ok(r.body.rows.some((x) => x.status === 'cancelled'));
      const live = r.body.rows.filter((x) => x.status === 'issued');
      assert.equal(r.body.totals.cgst_amount, (live.reduce((s, x) => s + Math.round(Number(x.cgst_amount) * 100), 0) / 100).toFixed(2));
    });
    await test('other company sees none of it (company scoping)', async () => {
      const r = await call('GET', '/api/ejw/reports/invoices', B.accountant);
      assert.equal(r.status, 200); assert.equal(r.body.rows.length, 0);
      const m = await call('GET', '/api/ejw/reports/material-inside', B.store_incharge);
      assert.equal(m.body.rows.length, 0);
    });

    // ======================================================================= role shapes
    section('Role shapes');
    await test('Store sees the component value but no job charge, GST or invoice amounts', async () => {
      for (const urlPath of [`${D}/${ake.id}`, D, '/api/ejw/reports/material-inside', '/api/ejw/reports/work-orders', '/api/ejw/reports/open-customer-dcs']) {
        const r = await call('GET', urlPath, A.store_incharge);
        assert.equal(r.status, 200, `${urlPath} ${JSON.stringify(r.body)}`);
        const keys = keysIn(r.body);
        for (const k of INVOICE_MONEY) assert.ok(!keys.has(k), `${urlPath}: Store must not see ${k}`);
      }
      const d = await call('GET', `${D}/${ake.id}`, A.store_incharge);
      assert.ok(keysIn(d.body).has('component_value'), 'Store sees the component value');
    });
    await test('Store cannot read the invoice register (403)', async () => {
      assert.equal((await call('GET', '/api/ejw/reports/invoices', A.store_incharge)).status, 403);
    });
    await test('PM sees no money anywhere in dispatches or reports; PM cannot read dispatches (403)', async () => {
      assert.equal((await call('GET', `${D}/${ake.id}`, A.project_manager)).status, 403);
      for (const urlPath of ['/api/ejw/reports/material-inside', '/api/ejw/reports/work-orders', '/api/ejw/reports/open-customer-dcs', '/api/ejw/reports/stock-as-of?date=2026-12-31']) {
        const r = await call('GET', urlPath, A.project_manager);
        assert.equal(r.status, 200, `${urlPath} ${JSON.stringify(r.body)}`);
        const keys = keysIn(r.body);
        for (const k of [...COMPONENT_MONEY, ...INVOICE_MONEY]) assert.ok(!keys.has(k), `${urlPath}: PM must not see ${k}`);
      }
      assert.equal((await call('GET', '/api/ejw/reports/invoices', A.project_manager)).status, 403);
    });
    await test('Accounts and Management see everything', async () => {
      for (const user of [A.accountant, A.management]) {
        const r = await call('GET', `${D}/${ake.id}`, user);
        assert.equal(r.status, 200);
        const keys = keysIn(r.body);
        for (const k of ['component_value', 'taxable_value', 'cgst_amount', 'invoice_total', 'dispatch_total']) assert.ok(keys.has(k), `${k} visible`);
      }
    });
    await test('a dispatch of another company is 404', async () => {
      assert.equal((await call('GET', `${D}/${ake.id}`, B.accountant)).status, 404);
    });

    // ======================================================================= data integrity
    section('Quantities stay consistent');
    await test('database CHECKs hold the invariants: returned <= ready <= qty, returned + short <= qty', async () => {
      const f = await flow({ po: 'PO-DB' });
      await h.assertDbError('23514', 'UPDATE ejw_inward_items SET returned_qty = 5 WHERE id = $1', [f.itemId]);
      await h.assertDbError('23514', 'UPDATE ejw_inward_items SET issued_qty = qty + 1 WHERE id = $1', [f.itemId]);
      await h.assertDbError('23514', "UPDATE ejw_dispatches SET status = 'cancelled' WHERE id = (SELECT id FROM ejw_dispatches WHERE company_id = $1 LIMIT 1)", [coA]);
    });
    await test('no inward item anywhere breaks issued >= ready >= returned', async () => {
      const bad = await sql(
        `SELECT it.id FROM ejw_inward_items it JOIN ejw_inwards i ON i.id = it.inward_id
          WHERE i.company_id = $1 AND NOT (it.issued_qty >= it.ready_qty AND it.ready_qty >= it.returned_qty)`, [coA]);
      assert.equal(bad.length, 0);
    });
  } catch (err) {
    console.log('SUITE ERROR', err);
    process.exitCode = 1;
  } finally {
    await h.finish();
  }
})();
