// External Job Work v2 - Phase 2: inward (S1/S2/S3), multi-receipt, customer DC later, acknowledgment,
// work orders, customer picker on the enquiry, duplicate-project fix, /debug removal, legacy routes.
// Run from backend/:  npm run test:ejw2
const fs = require('node:fs');
const path = require('node:path');
const { createHarness } = require('./helpers/harness');

const h = createHarness({ port: 3922, name: 'ejw-phase2' });
const { tag, pool, assert, call, test, section } = h;

const sql = async (text, params) => (await pool.query(text, params)).rows;
const today = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); const p = (x) => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
const uploadedFiles = [];

// multipart upload with a tiny fake PDF
async function upload(urlPath, user, fields, fileField, fileName = 'scan.pdf') {
  const form = new FormData();
  Object.entries(fields || {}).forEach(([k, v]) => form.append(k, String(v)));
  if (fileField) form.append(fileField, new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }), fileName);
  const res = await fetch(`http://localhost:3922${urlPath}`, { method: 'POST', headers: { Authorization: `Bearer ${h.token(user)}` }, body: form });
  let body = null;
  try { body = await res.json(); } catch (_) { /* empty */ }
  return { status: res.status, body };
}

// every money / invoice key anywhere in a response
function keysIn(value, found = new Set()) {
  if (Array.isArray(value)) value.forEach((v) => keysIn(v, found));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => { found.add(k); keysIn(v, found); });
  return found;
}
const COMPONENT_MONEY = ['unit_value', 'total_value', 'component_value'];
const INVOICE_MONEY = ['job_charge', 'taxable_value', 'gst_amount', 'cgst_amount', 'sgst_amount', 'igst_amount', 'invoice_total', 'dispatch_total'];

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
    'DELETE FROM project_status_history WHERE project_id IN (SELECT id FROM projects WHERE company_id = ANY($1))',
    'DELETE FROM enquiries WHERE company_id = ANY($1)',
    'DELETE FROM projects WHERE company_id = ANY($1)',
    'DELETE FROM master_customers WHERE company_id = ANY($1)',
    'DELETE FROM doc_sequences WHERE company_id = ANY($1)',
    'DELETE FROM stock_items WHERE company_id = ANY($1)'
  ];
  // enquiry PDFs and PO files saved on disk by the uploads in these tests
  const files = await pool.query('SELECT pdf_path, po_path FROM enquiries WHERE company_id = ANY($1)', ids).catch(() => ({ rows: [] }));
  for (const f of files.rows) for (const file of [f.pdf_path, f.po_path]) if (file) uploadedFiles.push(file);
  for (const s of steps) await pool.query(s, ids).catch((e) => console.log('  cleanup warn:', s.slice(0, 44), e.message));
  for (const f of uploadedFiles) fs.unlink(f, () => {});
}

(async () => {
  let coA; let coB; let A; let B;
  try {
    coA = await h.mkCompany('A', { gst_number: '29AAAAA0000A1Z5', state: 'Karnataka' });
    coB = await h.mkCompany('B', { gst_number: '33AAAAA0000A1Z5', state: 'Tamil Nadu' });
    A = {};
    for (const role of ['management', 'accountant', 'store_incharge', 'project_manager', 'npd', 'worker']) A[role] = await h.mkUser(role, coA);
    A.pm2 = await h.mkUser('project_manager', coA);
    B = {};
    for (const role of ['management', 'accountant', 'store_incharge', 'project_manager']) B[role] = await h.mkUser(role, coB);
    h.onCleanup(() => wipe(h.created.companies));
    await h.startServer();

    const mkCust = async (co, name, extra = {}) => (await sql(
      'INSERT INTO master_customers (company_id, name, gstin, state, email, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [co, `${tag} ${name}`, extra.gstin || null, extra.state || null, extra.email || null, extra.active !== false]))[0].id;
    const mkStock = async (co, name, hsn, unit = 'pcs') => (await sql('INSERT INTO stock_items (company_id, name, hsn, unit) VALUES ($1, $2, $3, $4) RETURNING id', [co, `${tag} ${name}`, hsn, unit]))[0].id;
    const cX = await mkCust(coA, 'Customer X', { gstin: '29BBBBB1111B1Z5', state: 'Karnataka', email: 'x@customer.test' });
    const cY = await mkCust(coA, 'Customer Y');
    const cOff = await mkCust(coA, 'Dormant', { active: false });
    const cB = await mkCust(coB, 'Customer B');
    const sS = await mkStock(coA, 'Shaft', '8483');
    const sT = await mkStock(coA, 'Plate', '7308', 'kg');
    const sB = await mkStock(coB, 'B Shaft', '8483');

    let dcN = 0;
    const body = (extra = {}) => {
      dcN += 1;
      return { customer_id: cX, customer_dc_no: `X-${String(dcN).padStart(3, '0')}`, customer_dc_date: '2026-10-01', received_date: today(),
        vehicle_no: 'KA01AB1234', items: [{ stock_item_id: sS, qty: '3', unit_value: '1500.50' }], ...extra };
    };
    const newInward = async (extra) => {
      const r = await call('POST', '/api/ejw/inwards', A.store_incharge, body(extra));
      assert.equal(r.status, 201, JSON.stringify(r.body));
      return r.body.inward;
    };
    const IN = '/api/ejw/inwards';
    const WO = '/api/ejw/work-orders';
    const notifs = async (userId, type) => sql('SELECT * FROM notifications WHERE user_id = $1 AND type = $2 ORDER BY id DESC', [userId, type]);

    // ======================================================================= customer picker on the enquiry
    section('Customer picker on the enquiry');
    let enq;
    await test('upload an enquiry with a customer: kept, and shown by name on the list and on the enquiry', async () => {
      const r = await upload('/api/enquiries/upload', A.management, { customer_id: cX, notes: 'n' }, 'pdf', 'enq.pdf');
      assert.equal(r.status, 201, JSON.stringify(r.body));
      enq = r.body.enquiry;
      assert.equal(enq.customer_id, cX);
      assert.equal((await call('GET', `/api/enquiries/${enq.id}`, A.management)).body.customer_name, `${tag} Customer X`);
      const list = (await call('GET', `/api/enquiries/company/${coA}`, A.management)).body.enquiries;
      assert.equal(list.find((e) => e.id === enq.id).customer_name, `${tag} Customer X`);
    });
    await test('the customer is optional at upload; another company\'s or a deactivated customer is refused (400) and nothing is created', async () => {
      const none = await upload('/api/enquiries/upload', A.management, {}, 'pdf', 'enq2.pdf');
      assert.equal(none.status, 201);
      assert.equal(none.body.enquiry.customer_id, null);
      const before = (await sql('SELECT count(*)::int AS n FROM enquiries WHERE company_id = $1', [coA]))[0].n;
      assert.equal((await upload('/api/enquiries/upload', A.management, { customer_id: cB }, 'pdf', 'x.pdf')).status, 400);
      assert.equal((await upload('/api/enquiries/upload', A.management, { customer_id: cOff }, 'pdf', 'x.pdf')).status, 400);
      assert.equal((await sql('SELECT count(*)::int AS n FROM enquiries WHERE company_id = $1', [coA]))[0].n, before);
    });
    await test('the customer can be set, changed and cleared on an existing enquiry; a missing field leaves it alone', async () => {
      const id = enq.id;
      assert.equal((await call('PUT', `/api/enquiries/${id}`, A.management, { customer_id: cY })).body.enquiry.customer_id, cY);
      assert.equal((await call('PUT', `/api/enquiries/${id}`, A.management, { notes: 'changed' })).body.enquiry.customer_id, cY);
      assert.equal((await call('PUT', `/api/enquiries/${id}`, A.management, { customer_id: null })).body.enquiry.customer_id, null);
      assert.equal((await call('PUT', `/api/enquiries/${id}`, A.management, { customer_id: cB })).status, 400);
      assert.equal((await call('PUT', `/api/enquiries/${id}`, A.management, { customer_id: cX })).body.enquiry.customer_id, cX);
    });

    // ======================================================================= inward: scenario S1
    section('Inward - S1, customer sends with its own DC');
    let in1;
    await test('S1: Store records the inward; SE/IN number, receipt 1, HSN from the stock item, value computed', async () => {
      in1 = await newInward();
      assert.match(in1.inward_no, /^SE\/IN\/\d{4}$/);
      assert.equal(in1.status, 'open');
      assert.equal(in1.customer_dc_pending, false);
      assert.equal(in1.third_party, false);
      assert.equal(in1.receipts.length, 1);
      assert.equal(in1.receipts[0].receipt_no, 1);
      assert.equal(in1.receipts[0].vehicle_no, 'KA01AB1234');
      const item = in1.items[0];
      assert.deepEqual([item.hsn, Number(item.qty), item.unit, item.unit_value, item.total_value, item.wo_id, item.receipt_no], ['8483', 3, 'pcs', '1500.50', '4501.50', null, 1]);
      assert.equal(in1.total_value, '4501.50');
      assert.equal(Number(item.pending_qty), 3);
    });
    await test('inward numbers are consecutive and a refused request uses no number', async () => {
      const a = await newInward();
      const dup = await call('POST', IN, A.store_incharge, body({ customer_dc_no: a.customer_dc_no, customer_dc_date: a.customer_dc_date.slice(0, 10) })); // exact duplicate: 409
      assert.equal(dup.status, 409);
      const b = await newInward();
      const n = (x) => parseInt(x.inward_no.slice(-4), 10);
      assert.equal(n(b), n(a) + 1);
    });
    await test('validation: DC no and date, e-way bill, received date, stock item, quantity, value, customer', async () => {
      const bad = async (extra, status, pattern) => {
        const r = await call('POST', IN, A.store_incharge, body(extra));
        assert.equal(r.status, status, JSON.stringify(extra) + ' -> ' + JSON.stringify(r.body));
        if (pattern) assert.match(r.body.error, pattern);
      };
      await bad({ customer_dc_no: '' }, 400, /Customer DC number is required/);
      await bad({ customer_dc_date: undefined }, 400, /Customer DC date is required/);
      await bad({ customer_dc_date: '2026-13-45' }, 400, /valid date/);
      await bad({ eway_bill_no: '12345' }, 400, /exactly 12 digits/);
      await bad({ received_date: daysAgo(-3) }, 400, /future/);
      await bad({ items: [] }, 400, /At least one item/);
      await bad({ items: [{ stock_item_id: 999999999, qty: '1', unit_value: '1' }] }, 400, /stock item not found/);
      await bad({ items: [{ qty: '1', unit_value: '1' }] }, 400, /choose a stock item/);
      await bad({ items: [{ stock_item_id: sB, qty: '1', unit_value: '1' }] }, 400, /stock item not found/); // another company's stock item
      await bad({ items: [{ stock_item_id: sS, qty: '0', unit_value: '1' }] }, 400, /quantity/);
      await bad({ items: [{ stock_item_id: sS, qty: '1.2345', unit_value: '1' }] }, 400, /quantity/);
      await bad({ items: [{ stock_item_id: sS, qty: '1' }] }, 400, /value per unit/);
      await bad({ items: [{ stock_item_id: sS, qty: '1', unit_value: '-5' }] }, 400, /value per unit/);
      await bad({ customer_id: cOff }, 400, /deactivated/);
      await bad({ customer_id: cB }, 404, /Customer not found/);
      await bad({ customer_id: undefined }, 400, /customer_id is required/);
      const ok = await call('POST', IN, A.store_incharge, body({ eway_bill_no: '271234567890' }));
      assert.equal(ok.status, 201);
      assert.equal(ok.body.inward.eway_bill_no, '271234567890');
    });
    await test('roles: only Store records an inward; Store, Accounts and Management read; PM, NPD and workers cannot', async () => {
      for (const role of ['project_manager', 'accountant', 'npd', 'management', 'worker']) assert.equal((await call('POST', IN, A[role], body())).status, 403, role);
      for (const role of ['store_incharge', 'accountant', 'management']) {
        assert.equal((await call('GET', IN, A[role])).status, 200, role);
        assert.equal((await call('GET', `${IN}/${in1.id}`, A[role])).status, 200, role);
      }
      for (const role of ['project_manager', 'npd', 'worker']) {
        assert.equal((await call('GET', IN, A[role])).status, 403, role);
        assert.equal((await call('GET', `${IN}/${in1.id}`, A[role])).status, 403, role);
      }
    });
    await test('company scoping: another company gets 404 and sees none of it', async () => {
      assert.equal((await call('GET', `${IN}/${in1.id}`, B.store_incharge)).status, 404);
      assert.equal((await call('GET', `${IN}/${in1.id}/acknowledgment`, B.store_incharge)).status, 404);
      assert.equal((await call('POST', `${IN}/${in1.id}/receipts`, B.store_incharge, { items: [] })).status, 404);
      assert.equal((await call('GET', IN, B.store_incharge)).body.inwards.length, 0);
    });
    await test('list filters: customer, status, dc_pending, search', async () => {
      const all = (await call('GET', IN, A.store_incharge)).body.inwards;
      assert.ok(all.length >= 3 && all.every((i) => i.customer_name));
      assert.ok((await call('GET', `${IN}?customer_id=${cY}`, A.store_incharge)).body.inwards.length === 0);
      assert.ok((await call('GET', `${IN}?search=${in1.inward_no}`, A.store_incharge)).body.inwards.some((i) => i.id === in1.id));
      assert.equal((await call('GET', `${IN}?status=bogus`, A.store_incharge)).status, 400);
      assert.ok((await call('GET', `${IN}?status=closed`, A.store_incharge)).body.inwards.length === 0);
    });

    // ======================================================================= duplicate customer DC
    section('Customer DC: duplicates');
    await test('same DC number AND date: 409 naming the inward, and pointing to "add a receipt"', async () => {
      const r = await call('POST', IN, A.store_incharge, body({ customer_dc_no: ` ${in1.customer_dc_no.toLowerCase()} `, customer_dc_date: in1.customer_dc_date.slice(0, 10) }));
      assert.equal(r.status, 409);
      assert.match(r.body.error, new RegExp(in1.inward_no.replace(/\//g, '\\/')));
      assert.match(r.body.error, /add a receipt/);
    });
    await test('same DC number on another date within 365 days: created, with a WARNING; another customer, or over a year ago: no warning', async () => {
      const r = await call('POST', IN, A.store_incharge, body({ customer_dc_no: in1.customer_dc_no, customer_dc_date: '2026-10-05' }));
      assert.equal(r.status, 201, JSON.stringify(r.body));
      assert.equal(r.body.warnings.length, 1);
      assert.equal(r.body.warnings[0].code, 'DUPLICATE_CUSTOMER_DC');
      assert.equal(r.body.warnings[0].inward_no, in1.inward_no);
      const other = await call('POST', IN, A.store_incharge, body({ customer_id: cY, customer_dc_no: in1.customer_dc_no }));
      assert.equal(other.status, 201);
      assert.deepEqual(other.body.warnings, []);
      // an inward from this customer more than a year ago with the same number
      const old = await newInward({ customer_dc_no: 'OLD-DC-1', customer_dc_date: daysAgo(400) });
      await sql('UPDATE ejw_inwards SET received_date = $2 WHERE id = $1', [old.id, daysAgo(400)]);
      const again = await call('POST', IN, A.store_incharge, body({ customer_dc_no: 'OLD-DC-1', customer_dc_date: daysAgo(1) }));
      assert.equal(again.status, 201);
      assert.deepEqual(again.body.warnings, []);
    });

    // ======================================================================= S2
    section('Inward - S2, sent by a third party; customer DC attached later');
    let in2;
    await test('S2: third party inward needs the supplier name and DC; the customer DC is optional and shows as pending', async () => {
      const noName = await call('POST', IN, A.store_incharge, body({ third_party: true, customer_dc_no: undefined, customer_dc_date: undefined, supplier_dc_no: 'A020' }));
      assert.equal(noName.status, 400);
      assert.match(noName.body.error, /name of the supplier/);
      const noDc = await call('POST', IN, A.store_incharge, body({ third_party: true, customer_dc_no: undefined, customer_dc_date: undefined, supplier_name: 'Supplier A' }));
      assert.equal(noDc.status, 400);
      assert.match(noDc.body.error, /supplier's DC number/);
      assert.equal((await call('POST', IN, A.store_incharge, body({ third_party: true, customer_dc_no: undefined, customer_dc_date: undefined, supplier_name: 'S', supplier_dc_no: 'A1', supplier_gstin: 'bad' }))).status, 400);
      const r = await call('POST', IN, A.store_incharge, body({
        third_party: true, customer_dc_no: undefined, customer_dc_date: undefined, supplier_name: 'Supplier A', supplier_gstin: '29AAAAA1111A1Z5',
        supplier_dc_no: 'A020', supplier_dc_date: '2026-10-12', eway_bill_no: '271234567890'
      }));
      assert.equal(r.status, 201, JSON.stringify(r.body));
      in2 = r.body.inward;
      assert.equal(in2.third_party, true);
      assert.equal(in2.customer_dc_pending, true);
      assert.equal(in2.customer_dc_no, null);
      assert.deepEqual([in2.supplier_name, in2.supplier_dc_no, in2.supplier_gstin], ['Supplier A', 'A020', '29AAAAA1111A1Z5']);
    });
    await test('Accounts is told the customer DC is still awaited (notification carries the inward id); dc_pending list shows it', async () => {
      const n = (await notifs(A.accountant.id, 'ejw_customer_dc_pending')).find((x) => x.data && x.data.inward_id === in2.id);
      assert.ok(n);
      assert.match(n.message, /dispatch is blocked/);
      assert.ok((await call('GET', `${IN}?dc_pending=1`, A.accountant)).body.inwards.some((i) => i.id === in2.id));
    });
    await test('the acknowledgment text names the supplier, DC no and date, the item and quantity, the value, and asks for PO and DC', async () => {
      const r = await call('GET', `${IN}/${in2.id}/acknowledgment`, A.store_incharge);
      assert.equal(r.status, 200);
      const a = r.body.acknowledgment;
      assert.match(a.body, /Dear .*Customer X/);
      assert.match(a.body, /received your component from Supplier A vide DC no\. A020 dated 12-10-2026/);
      assert.match(a.body, /Shaft \(3 pcs\)/);
      assert.match(a.body, /Declared value Rs 4,501\.50/);
      assert.match(a.body, /send us your PO and your own delivery challan/);
      assert.ok(a.body.includes(in2.inward_no));
      assert.equal(a.to, 'x@customer.test');
      assert.ok(a.mailto.startsWith('mailto:x@customer.test?subject='));
      assert.ok(a.mailto.includes(encodeURIComponent(a.subject)));
      assert.equal(a.total_value, '4501.50');
    });
    await test('acknowledgment: only for third-party inwards (400), Store/Accounts/Management only, company scoped', async () => {
      assert.equal((await call('GET', `${IN}/${in1.id}/acknowledgment`, A.store_incharge)).status, 400);
      assert.equal((await call('GET', `${IN}/${in2.id}/acknowledgment`, A.project_manager)).status, 403);
      assert.equal((await call('GET', `${IN}/${in2.id}/acknowledgment`, A.accountant)).status, 200);
      assert.equal((await call('GET', `${IN}/${in2.id}/acknowledgment`, A.management)).status, 200);
    });
    await test('attach the customer DC later: number and date required; once only; accountant notified; duplicates caught', async () => {
      const url = `${IN}/${in2.id}/customer-dc`;
      assert.equal((await call('POST', url, A.store_incharge, { customer_dc_no: 'X020' })).status, 400); // date missing
      assert.equal((await call('POST', url, A.store_incharge, { customer_dc_date: '2026-10-14' })).status, 400); // number missing
      assert.equal((await call('POST', url, A.project_manager, { customer_dc_no: 'X020', customer_dc_date: '2026-10-14' })).status, 403);
      assert.equal((await call('POST', url, B.store_incharge, { customer_dc_no: 'X020', customer_dc_date: '2026-10-14' })).status, 404);
      const exact = await call('POST', url, A.store_incharge, { customer_dc_no: in1.customer_dc_no, customer_dc_date: in1.customer_dc_date.slice(0, 10) });
      assert.equal(exact.status, 409); // already received as in1
      const ok = await call('POST', url, A.store_incharge, { customer_dc_no: 'X020', customer_dc_date: '2026-10-14' });
      assert.equal(ok.status, 200, JSON.stringify(ok.body));
      assert.equal(ok.body.inward.customer_dc_no, 'X020');
      assert.equal(ok.body.inward.customer_dc_pending, false);
      assert.ok((await notifs(A.accountant.id, 'ejw_customer_dc_attached')).some((x) => x.data.inward_id === in2.id));
      const again = await call('POST', url, A.store_incharge, { customer_dc_no: 'X021', customer_dc_date: '2026-10-15' });
      assert.equal(again.status, 400);
      assert.match(again.body.error, /already has customer DC X020/);
      assert.ok(!(await call('GET', `${IN}?dc_pending=1`, A.accountant)).body.inwards.some((i) => i.id === in2.id));
    });
    await test('attaching a DC number used within the last year for a different date returns a warning, not an error', async () => {
      const third = await call('POST', IN, A.store_incharge, body({ third_party: true, customer_dc_no: undefined, customer_dc_date: undefined, supplier_name: 'Supplier B', supplier_dc_no: 'B77' }));
      const r = await call('POST', `${IN}/${third.body.inward.id}/customer-dc`, A.store_incharge, { customer_dc_no: 'X020', customer_dc_date: '2026-11-02' });
      assert.equal(r.status, 200);
      assert.equal(r.body.warnings[0].code, 'DUPLICATE_CUSTOMER_DC');
    });

    // ======================================================================= more receipts
    section('Several trucks for one customer DC');
    await test('add a receipt: next receipt number, its own date / vehicle / e-way bill, new items belong to it', async () => {
      const r = await call('POST', `${IN}/${in1.id}/receipts`, A.store_incharge, {
        received_date: daysAgo(1), vehicle_no: 'KA05ZZ9999', eway_bill_no: '381234567890', notes: 'second truck',
        items: [{ stock_item_id: sT, qty: '12.5', unit_value: '80' }]
      });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      assert.equal(r.body.receipt_no, 2);
      const inward = r.body.inward;
      assert.equal(inward.receipts.length, 2);
      assert.deepEqual([inward.receipts[1].receipt_no, inward.receipts[1].vehicle_no, inward.receipts[1].eway_bill_no, inward.receipts[1].notes], [2, 'KA05ZZ9999', '381234567890', 'second truck']);
      assert.equal(inward.receipts[1].received_date.slice(0, 10), daysAgo(1));
      assert.equal(inward.receipts[0].vehicle_no, 'KA01AB1234'); // the first truck keeps its own details
      assert.equal(inward.items.length, 2);
      const second = inward.items.find((i) => i.stock_item_id === sT);
      assert.deepEqual([second.receipt_no, second.hsn, second.unit, second.total_value], [2, '7308', 'kg', '1000.00']);
      assert.equal(inward.total_value, '5501.50');
      assert.equal((await call('POST', `${IN}/${in1.id}/receipts`, A.store_incharge, { items: [{ stock_item_id: sS, qty: '1', unit_value: '1' }] })).body.receipt_no, 3);
    });
    await test('add a receipt: validated like an inward; Store only; closed inward reopens; no customer DC needed', async () => {
      const url = `${IN}/${in1.id}/receipts`;
      assert.equal((await call('POST', url, A.store_incharge, { items: [] })).status, 400);
      assert.equal((await call('POST', url, A.store_incharge, { eway_bill_no: '1', items: [{ stock_item_id: sS, qty: '1', unit_value: '1' }] })).status, 400);
      assert.equal((await call('POST', url, A.store_incharge, { received_date: daysAgo(-2), items: [{ stock_item_id: sS, qty: '1', unit_value: '1' }] })).status, 400);
      for (const role of ['project_manager', 'accountant', 'npd', 'management']) assert.equal((await call('POST', url, A[role], { items: [{ stock_item_id: sS, qty: '1', unit_value: '1' }] })).status, 403, role);
      await sql("UPDATE ejw_inwards SET status = 'closed', closed_at = now() WHERE id = $1", [in1.id]);
      const r = await call('POST', url, A.store_incharge, { items: [{ stock_item_id: sS, qty: '2', unit_value: '10' }] });
      assert.equal(r.status, 201);
      assert.equal(r.body.inward.status, 'open');
      assert.equal(r.body.inward.closed_at, null);
    });
    await test('receipt documents: scans of the DCs can be attached to the inward or to one receipt; kinds are checked', async () => {
      const ok = await upload(`${IN}/${in1.id}/documents`, A.store_incharge, { kind: 'customer_dc' }, 'file', 'x020.pdf');
      assert.equal(ok.status, 201, JSON.stringify(ok.body));
      const doc = ok.body.inward.documents.find((d) => d.kind === 'customer_dc');
      assert.equal(doc.file_name, 'x020.pdf');
      uploadedFiles.push(path.join(__dirname, '..', doc.file_path));
      const second = await upload(`${IN}/${in1.id}/documents`, A.store_incharge, { kind: 'photo', receipt_id: ok.body.inward.receipts[1].id }, 'file', 'truck2.pdf');
      assert.equal(second.status, 201);
      const withReceipt = second.body.inward.documents.find((d) => d.kind === 'photo');
      assert.equal(withReceipt.receipt_id, ok.body.inward.receipts[1].id);
      uploadedFiles.push(path.join(__dirname, '..', withReceipt.file_path));
      assert.equal((await upload(`${IN}/${in1.id}/documents`, A.store_incharge, { kind: 'bogus' }, 'file')).status, 400);
      assert.equal((await upload(`${IN}/${in1.id}/documents`, A.store_incharge, { kind: 'photo' }, null)).status, 400);
      assert.equal((await upload(`${IN}/${in1.id}/documents`, A.store_incharge, { kind: 'photo', receipt_id: 999999999 }, 'file')).status, 400);
      assert.equal((await upload(`${IN}/${in1.id}/documents`, A.project_manager, { kind: 'photo' }, 'file')).status, 403);
      assert.equal((await upload(`${IN}/${in1.id}/documents`, B.store_incharge, { kind: 'photo' }, 'file')).status, 404);
      const leftovers = fs.readdirSync(path.join(__dirname, '..', 'uploads')).filter((f) => f.startsWith('ejw-inward-'));
      assert.ok(leftovers.length >= 2);
    });

    // ======================================================================= awaiting work + role shapes
    section('External stock awaiting work, and who sees which money');
    await test('any PM sees the stock not yet on a work order, per customer; other companies see nothing', async () => {
      for (const pm of [A.project_manager, A.pm2]) {
        const r = await call('GET', '/api/ejw/stock-awaiting-work', pm);
        assert.equal(r.status, 200);
        const x = r.body.customers.find((c) => c.customer_id === cX);
        assert.ok(x && x.inwards.length >= 2);
        const row = x.inwards.find((i) => i.inward_id === in1.id);
        assert.equal(row.customer_dc_pending, false);
        assert.ok(row.items.every((i) => Number(i.pending_qty) > 0 && i.days_held >= 0));
        assert.ok(x.inwards.some((i) => i.inward_id === in2.id));
      }
      assert.deepEqual((await call('GET', '/api/ejw/stock-awaiting-work', B.project_manager)).body.customers, []);
      assert.equal((await call('GET', '/api/ejw/stock-awaiting-work', A.npd)).status, 403);
      assert.equal((await call('GET', '/api/ejw/stock-awaiting-work', A.worker)).status, 403);
    });
    await test('the PM never sees money; Store sees the component value; Accounts and Management see everything', async () => {
      const pm = keysIn((await call('GET', '/api/ejw/stock-awaiting-work', A.project_manager)).body);
      for (const k of [...COMPONENT_MONEY, ...INVOICE_MONEY]) assert.ok(!pm.has(k), `PM response has ${k}`);
      const store = keysIn((await call('GET', `${IN}/${in1.id}`, A.store_incharge)).body);
      for (const k of ['unit_value', 'total_value']) assert.ok(store.has(k), `Store should see ${k}`);
      for (const k of INVOICE_MONEY) assert.ok(!store.has(k), `Store response has ${k}`);
      for (const role of ['accountant', 'management']) {
        const keys = keysIn((await call('GET', `${IN}/${in1.id}`, A[role])).body);
        assert.ok(keys.has('unit_value') && keys.has('total_value'), role);
      }
      const awaitingStore = keysIn((await call('GET', '/api/ejw/stock-awaiting-work', A.store_incharge)).body);
      assert.ok(awaitingStore.has('total_value'));
    });

    // ======================================================================= work orders S1/S2
    section('Work orders from stock (S1 / S2)');
    let wo1; let woItems;
    await test('a PM makes a work order from items of one customer: SE/WO number, open, PM assigned, project created', async () => {
      woItems = (await call('GET', `${IN}/${in1.id}`, A.store_incharge)).body.inward.items.map((i) => i.id).slice(0, 2);
      const r = await call('POST', WO, A.project_manager, { inward_item_ids: woItems, description: 'Machine the shafts' });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      wo1 = r.body.work_order;
      assert.match(wo1.wo_no, /^SE\/WO\/\d{4}$/);
      assert.deepEqual([wo1.status, wo1.source, wo1.pm_id, wo1.customer_id, wo1.enquiry_id], ['open', 'stock', A.project_manager.id, cX, null]);
      assert.equal(wo1.items.length, 2);
      assert.ok(wo1.items.every((i) => i.customer_dc_no === in1.customer_dc_no && i.pending_qty !== undefined));
      const project = (await sql('SELECT * FROM projects WHERE id = $1', [wo1.project_id]))[0];
      assert.deepEqual([project.project_type, project.assigned_to, project.name, project.status, project.company_id], ['external_job_work', A.project_manager.id, wo1.wo_no, 'pending', coA]);
      assert.equal((await sql('SELECT count(*)::int AS n FROM project_status_history WHERE project_id = $1', [wo1.project_id]))[0].n, 1);
      assert.equal((await sql('SELECT count(*)::int AS n FROM ejw_inward_items WHERE wo_id = $1', [wo1.id]))[0].n, 2);
      const keys = keysIn(r.body);
      for (const k of [...COMPONENT_MONEY, ...INVOICE_MONEY]) assert.ok(!keys.has(k), `PM response has ${k}`);
    });
    await test('those items leave the awaiting list', async () => {
      const r = await call('GET', '/api/ejw/stock-awaiting-work', A.pm2);
      const ids = r.body.customers.flatMap((c) => c.inwards.flatMap((i) => i.items.map((x) => x.item_id)));
      for (const id of woItems) assert.ok(!ids.includes(id));
    });
    await test('work order rules: one customer, not already on a work order, not already returned, own company, PM only', async () => {
      const y = await newInward({ customer_id: cY });
      const mixed = await call('POST', WO, A.project_manager, { inward_item_ids: [y.items[0].id, (await call('GET', `${IN}/${in2.id}`, A.store_incharge)).body.inward.items[0].id] });
      assert.equal(mixed.status, 400);
      assert.match(mixed.body.error, /single customer/);
      const taken = await call('POST', WO, A.pm2, { inward_item_ids: [woItems[0]] });
      assert.equal(taken.status, 409);
      assert.match(taken.body.error, /already on a work order/);
      await sql('UPDATE ejw_inward_items SET ready_qty = qty, returned_qty = qty WHERE id = $1', [y.items[0].id]);
      const gone = await call('POST', WO, A.project_manager, { inward_item_ids: [y.items[0].id] });
      assert.equal(gone.status, 400);
      assert.match(gone.body.error, /already gone back/);
      const foreign = await newInward({}); // company A item used by company B
      assert.equal((await call('POST', WO, B.project_manager, { inward_item_ids: [foreign.items[0].id] })).status, 404);
      assert.equal((await call('POST', WO, A.project_manager, { inward_item_ids: [] })).status, 400);
      assert.equal((await call('POST', WO, A.project_manager, { inward_item_ids: [foreign.items[0].id, foreign.items[0].id] })).status, 400);
      for (const role of ['store_incharge', 'accountant', 'npd', 'management', 'worker']) assert.equal((await call('POST', WO, A[role], { inward_item_ids: [foreign.items[0].id] })).status, 403, role);
      // nothing was created by the refused requests
      assert.equal((await sql('SELECT count(*)::int AS n FROM work_orders WHERE company_id = $1', [coA]))[0].n, 1);
    });
    await test('work order read: a PM sees only their own; NPD, Store, Accounts and Management see all; other companies 404; filters', async () => {
      assert.equal((await call('GET', `${WO}/${wo1.id}`, A.project_manager)).status, 200);
      assert.equal((await call('GET', `${WO}/${wo1.id}`, A.pm2)).status, 403);
      for (const role of ['npd', 'store_incharge', 'accountant', 'management']) assert.equal((await call('GET', `${WO}/${wo1.id}`, A[role])).status, 200, role);
      assert.equal((await call('GET', `${WO}/${wo1.id}`, B.project_manager)).status, 404);
      assert.equal((await call('GET', `${WO}/${wo1.id}`, A.worker)).status, 403);
      assert.ok((await call('GET', WO, A.project_manager)).body.work_orders.some((w) => w.id === wo1.id));
      assert.equal((await call('GET', WO, A.pm2)).body.work_orders.length, 0);
      assert.ok((await call('GET', `${WO}?status=open&customer_id=${cX}`, A.store_incharge)).body.work_orders.some((w) => w.id === wo1.id));
      assert.equal((await call('GET', `${WO}?status=bogus`, A.store_incharge)).status, 400);
    });
    await test('money by role on a work order: PM none, Store component value only, Accounts all', async () => {
      const pm = keysIn((await call('GET', `${WO}/${wo1.id}`, A.project_manager)).body);
      const npd = keysIn((await call('GET', `${WO}/${wo1.id}`, A.npd)).body);
      const store = keysIn((await call('GET', `${WO}/${wo1.id}`, A.store_incharge)).body);
      const acc = keysIn((await call('GET', `${WO}/${wo1.id}`, A.accountant)).body);
      for (const k of [...COMPONENT_MONEY, ...INVOICE_MONEY]) { assert.ok(!pm.has(k), `PM has ${k}`); assert.ok(!npd.has(k), `NPD has ${k}`); }
      assert.ok(store.has('unit_value') && store.has('total_value'));
      for (const k of INVOICE_MONEY) assert.ok(!store.has(k), `Store has ${k}`);
      assert.ok(acc.has('unit_value') && acc.has('total_value'));
    });
    await test('PO number and description: the PM and NPD can set them; another PM cannot; closed work orders are locked', async () => {
      const url = `${WO}/${wo1.id}`;
      const ok = await call('PUT', url, A.project_manager, { customer_po_no: 'PO/2026/77', description: 'Machining of shafts' });
      assert.equal(ok.status, 200, JSON.stringify(ok.body));
      assert.deepEqual([ok.body.work_order.customer_po_no, ok.body.work_order.description], ['PO/2026/77', 'Machining of shafts']);
      assert.equal((await call('PUT', url, A.npd, { customer_po_no: 'PO/2026/78' })).body.work_order.customer_po_no, 'PO/2026/78');
      assert.equal((await call('PUT', url, A.pm2, { customer_po_no: 'X' })).status, 403);
      assert.equal((await call('PUT', url, A.store_incharge, { customer_po_no: 'X' })).status, 403);
      assert.equal((await call('PUT', url, A.project_manager, {})).status, 400);
      assert.equal((await call('PUT', url, A.project_manager, { customer_po_no: 'x'.repeat(101) })).status, 400);
      await sql("UPDATE work_orders SET status = 'closed' WHERE id = $1", [wo1.id]);
      assert.equal((await call('PUT', url, A.project_manager, { customer_po_no: 'LATE' })).status, 400);
      await sql("UPDATE work_orders SET status = 'open' WHERE id = $1", [wo1.id]);
    });
    await test('work order documents: drawing, quotation, inspection report, PO; kinds checked; own PM or NPD only', async () => {
      const url = `${WO}/${wo1.id}/documents`;
      const ok = await upload(url, A.project_manager, { kind: 'drawing', note: 'rev B' }, 'file', 'drawing.pdf');
      assert.equal(ok.status, 201, JSON.stringify(ok.body));
      const doc = ok.body.work_order.documents[0];
      assert.deepEqual([doc.kind, doc.file_name, doc.note], ['drawing', 'drawing.pdf', 'rev B']);
      uploadedFiles.push(path.join(__dirname, '..', doc.file_path));
      const byNpd = await upload(url, A.npd, { kind: 'customer_po' }, 'file', 'po.pdf');
      assert.equal(byNpd.status, 201);
      uploadedFiles.push(path.join(__dirname, '..', byNpd.body.work_order.documents[1].file_path));
      assert.equal((await upload(url, A.project_manager, { kind: 'bogus' }, 'file')).status, 400);
      assert.equal((await upload(url, A.project_manager, { kind: 'drawing' }, null)).status, 400);
      assert.equal((await upload(url, A.pm2, { kind: 'drawing' }, 'file')).status, 403);
      assert.equal((await upload(url, A.store_incharge, { kind: 'drawing' }, 'file')).status, 403);
      assert.equal((await upload(url, B.project_manager, { kind: 'drawing' }, 'file')).status, 404); // another company
    });
    await test('material added to a work order\'s inward later goes to the same job by default; an explicit "none" leaves it waiting', async () => {
      const toSame = await call('POST', `${IN}/${in1.id}/receipts`, A.store_incharge, { items: [{ stock_item_id: sS, qty: '1', unit_value: '5' }], against_wo_id: wo1.id });
      assert.equal(toSame.status, 201);
      const none = await call('POST', `${IN}/${in1.id}/receipts`, A.store_incharge, { items: [{ stock_item_id: sS, qty: '1', unit_value: '5' }], against_wo_id: null });
      assert.equal(none.status, 201);
      const items = none.body.inward.items;
      assert.equal(items[items.length - 2].wo_id, wo1.id);
      assert.equal(items[items.length - 1].wo_id, null);
      const wrongCustomer = await call('POST', `${IN}/${in1.id}/receipts`, A.store_incharge, { items: [{ stock_item_id: sS, qty: '1', unit_value: '5' }], against_wo_id: 999999999 });
      assert.equal(wrongCustomer.status, 404);
    });

    // ======================================================================= S3
    section('S3 - enquiry, PO, work order awaiting material, inward against the open job');
    let s3Enq; let s3Wo; let s3Project;
    await test('PO upload as External Job Work creates the project AND its work order together (awaiting material, no PM, customer PO kept)', async () => {
      const up = await upload('/api/enquiries/upload', A.management, { customer_id: cY }, 'pdf', 's3.pdf');
      s3Enq = up.body.enquiry;
      assert.equal((await call('POST', `/api/enquiries/${s3Enq.id}/send-to-npd`, A.management, { npd_user_id: A.npd.id })).status, 200);
      const po = await upload(`/api/enquiries/${s3Enq.id}/upload-po`, A.npd, { project_type: 'external_job_work', customer_po_no: 'CUST-PO-9001' }, 'po', 'po9001.pdf');
      assert.equal(po.status, 200, JSON.stringify(po.body));
      s3Project = po.body.project;
      s3Wo = po.body.work_order;
      assert.equal(s3Project.project_type, 'external_job_work');
      assert.deepEqual([s3Wo.status, s3Wo.source, s3Wo.pm_id, s3Wo.customer_id, s3Wo.enquiry_id, s3Wo.project_id, s3Wo.customer_po_no],
        ['awaiting_material', 'enquiry', null, cY, s3Enq.id, s3Project.id, 'CUST-PO-9001']);
      assert.match(s3Wo.wo_no, /^SE\/WO\/\d{4}$/);
      const docs = await sql('SELECT kind, file_name, file_path FROM work_order_documents WHERE wo_id = $1', [s3Wo.id]);
      assert.deepEqual([docs.length, docs[0].kind, docs[0].file_name], [1, 'customer_po', 'po9001.pdf']);
      assert.equal((await sql('SELECT count(*)::int AS n FROM projects WHERE company_id = $1 AND project_type = $2 AND po_number LIKE $3', [coA, 'external_job_work', `PO${s3Enq.enquiry_number}%`]))[0].n, 1);
      assert.equal((await sql('SELECT count(*)::int AS n FROM work_orders WHERE enquiry_id = $1', [s3Enq.id]))[0].n, 1);
      uploadedFiles.push(path.join(__dirname, '..', 'uploads', 'enquiries', `PO_${s3Enq.enquiry_number}_po9001.pdf`));
    });
    await test('DUPLICATE-PROJECT BUG: customer-review never creates a project, even when asked to; a second external PO is refused (409)', async () => {
      const projectsBefore = (await sql('SELECT count(*)::int AS n FROM projects WHERE company_id = $1', [coA]))[0].n;
      const wosBefore = (await sql('SELECT count(*)::int AS n FROM work_orders WHERE company_id = $1', [coA]))[0].n;
      const review = await call('PUT', `/api/enquiries/${s3Enq.id}/customer-review`, A.npd, { status: 'accepted_by_customer', remarks: 'ok', project_type: 'external_job_work' });
      assert.equal(review.status, 200);
      assert.equal(review.body.enquiry.status, 'accepted_by_customer');
      assert.equal(review.body.project, undefined);
      assert.equal((await sql('SELECT count(*)::int AS n FROM projects WHERE company_id = $1', [coA]))[0].n, projectsBefore);
      const again = await upload(`/api/enquiries/${s3Enq.id}/upload-po`, A.management, { project_type: 'external_job_work' }, 'po', 'again.pdf');
      assert.equal(again.status, 409);
      assert.match(again.body.error, /already exists for this enquiry/);
      assert.equal((await sql('SELECT count(*)::int AS n FROM projects WHERE company_id = $1', [coA]))[0].n, projectsBefore);
      assert.equal((await sql('SELECT count(*)::int AS n FROM work_orders WHERE company_id = $1', [coA]))[0].n, wosBefore);
    });
    await test('External PO without a customer on the enquiry is refused (400) and creates nothing; a regular PO is unchanged and makes no work order', async () => {
      const noCust = (await upload('/api/enquiries/upload', A.management, {}, 'pdf', 'nc.pdf')).body.enquiry;
      const before = (await sql('SELECT count(*)::int AS n FROM projects WHERE company_id = $1', [coA]))[0].n;
      const r = await upload(`/api/enquiries/${noCust.id}/upload-po`, A.management, { project_type: 'external_job_work' }, 'po', 'x.pdf');
      assert.equal(r.status, 400);
      assert.match(r.body.error, /Choose the customer/);
      assert.equal((await sql('SELECT count(*)::int AS n FROM projects WHERE company_id = $1', [coA]))[0].n, before);
      assert.equal((await sql('SELECT po_path FROM enquiries WHERE id = $1', [noCust.id]))[0].po_path, null);
      const regular = await upload(`/api/enquiries/${noCust.id}/upload-po`, A.management, { project_type: 'regular' }, 'po', 'reg.pdf');
      assert.equal(regular.status, 200, JSON.stringify(regular.body));
      assert.equal(regular.body.project.project_type, 'regular');
      assert.equal(regular.body.work_order, null);
      assert.equal((await sql('SELECT count(*)::int AS n FROM work_orders WHERE enquiry_id = $1', [noCust.id]))[0].n, 0);
      uploadedFiles.push(path.join(__dirname, '..', 'uploads', 'enquiries', `PO_${noCust.enquiry_number}_reg.pdf`));
    });
    await test('Store picks "against open job": the customer\'s jobs awaiting material are listed', async () => {
      const r = await call('GET', `${WO}?customer_id=${cY}&status=awaiting_material`, A.store_incharge);
      assert.equal(r.status, 200);
      assert.deepEqual(r.body.work_orders.map((w) => w.id), [s3Wo.id]);
      assert.deepEqual((await call('GET', `${WO}?customer_id=${cX}&status=awaiting_material`, A.store_incharge)).body.work_orders, []);
    });
    await test('inward AGAINST the open job: items join it, it becomes open, and the NPD is told because it has no PM yet', async () => {
      const r = await call('POST', IN, A.store_incharge, body({ customer_id: cY, against_wo_id: s3Wo.id, items: [{ stock_item_id: sS, qty: '5', unit_value: '100' }, { stock_item_id: sT, qty: '2', unit_value: '50' }] }));
      assert.equal(r.status, 201, JSON.stringify(r.body));
      assert.ok(r.body.inward.items.every((i) => i.wo_id === s3Wo.id && i.wo_no === s3Wo.wo_no));
      assert.equal((await sql('SELECT status FROM work_orders WHERE id = $1', [s3Wo.id]))[0].status, 'open');
      const n = (await notifs(A.npd.id, 'ejw_inward_no_pm')).find((x) => x.data && x.data.wo_id === s3Wo.id);
      assert.ok(n, 'NPD notified');
      assert.match(n.message, /no project manager yet/);
      assert.equal(n.data.inward_id, r.body.inward.id);
      assert.equal(n.project_id, s3Project.id);
      assert.ok((await sql('SELECT 1 FROM project_status_history WHERE project_id = $1 AND new_status = $2', [s3Project.id, 'Open'])).length === 1);
      const stockLists = (await call('GET', '/api/ejw/stock-awaiting-work', A.project_manager)).body.customers;
      assert.ok(!stockLists.some((c) => c.customer_id === cY && c.inwards.some((i) => i.inward_id === r.body.inward.id)));
    });
    await test('against_wo_id checks: another customer\'s job 400, a closed job 400, another company\'s job 404', async () => {
      assert.equal((await call('POST', IN, A.store_incharge, body({ customer_id: cX, against_wo_id: s3Wo.id }))).status, 400); // job is Customer Y's
      await sql("UPDATE work_orders SET status = 'closed' WHERE id = $1", [s3Wo.id]);
      const closed = await call('POST', IN, A.store_incharge, body({ customer_id: cY, against_wo_id: s3Wo.id }));
      assert.equal(closed.status, 400);
      assert.match(closed.body.error, /is closed/);
      await sql("UPDATE work_orders SET status = 'open' WHERE id = $1", [s3Wo.id]);
      assert.equal((await call('POST', IN, B.store_incharge, { ...body({ customer_id: cB, items: [{ stock_item_id: sB, qty: '1', unit_value: '1' }] }), against_wo_id: s3Wo.id })).status, 404);
    });
    await test('assigning a project manager to the project makes them the work order\'s PM and tells them; assigning a non-PM clears it', async () => {
      const r = await call('PUT', `/api/projects/${s3Project.id}`, A.npd, { assigned_to: A.pm2.id });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal((await sql('SELECT pm_id FROM work_orders WHERE id = $1', [s3Wo.id]))[0].pm_id, A.pm2.id);
      assert.ok((await notifs(A.pm2.id, 'ejw_wo_assigned')).some((x) => x.data.wo_id === s3Wo.id));
      assert.equal((await call('GET', `${WO}/${s3Wo.id}`, A.pm2)).status, 200); // now theirs
      assert.equal((await call('GET', `${WO}/${s3Wo.id}`, A.project_manager)).status, 403);
      await call('PUT', `/api/projects/${s3Project.id}`, A.npd, { assigned_to: A.npd.id });
      assert.equal((await sql('SELECT pm_id FROM work_orders WHERE id = $1', [s3Wo.id]))[0].pm_id, null);
      await call('PUT', `/api/projects/${s3Project.id}`, A.npd, { assigned_to: A.pm2.id });
    });
    await test('with a PM assigned, the next inward notifies the PM instead of the NPD', async () => {
      const npdBefore = (await notifs(A.npd.id, 'ejw_inward_no_pm')).length;
      const r = await call('POST', IN, A.store_incharge, body({ customer_id: cY, against_wo_id: s3Wo.id }));
      assert.equal(r.status, 201);
      assert.ok((await notifs(A.pm2.id, 'ejw_material_received')).some((x) => x.data.inward_id === r.body.inward.id && x.data.wo_id === s3Wo.id));
      assert.equal((await notifs(A.npd.id, 'ejw_inward_no_pm')).length, npdBefore);
    });
    await test('the optional "expected material" note: a note only; allowed while awaiting material; creates nothing else', async () => {
      const up = await upload('/api/enquiries/upload', A.management, { customer_id: cY }, 'pdf', 'e2.pdf');
      await call('POST', `/api/enquiries/${up.body.enquiry.id}/send-to-npd`, A.management, { npd_user_id: A.npd.id });
      const po = await upload(`/api/enquiries/${up.body.enquiry.id}/upload-po`, A.npd, { project_type: 'external_job_work' }, 'po', 'p2.pdf');
      uploadedFiles.push(path.join(__dirname, '..', 'uploads', 'enquiries', `PO_${up.body.enquiry.enquiry_number}_p2.pdf`));
      const wo = po.body.work_order;
      const inwardsBefore = (await sql('SELECT count(*)::int AS n FROM ejw_inwards WHERE company_id = $1', [coA]))[0].n;
      const ok = await call('PUT', `${WO}/${wo.id}/expected-material`, A.npd, { note: '4 shafts from Customer Y next week' });
      assert.equal(ok.status, 200);
      assert.equal(ok.body.work_order.expected_material_note, '4 shafts from Customer Y next week');
      assert.equal((await sql('SELECT count(*)::int AS n FROM ejw_inwards WHERE company_id = $1', [coA]))[0].n, inwardsBefore);
      assert.equal((await call('PUT', `${WO}/${wo.id}/expected-material`, A.store_incharge, { note: 'x' })).status, 403);
      await sql("UPDATE work_orders SET status = 'open' WHERE id = $1", [wo.id]);
      const late = await call('PUT', `${WO}/${wo.id}/expected-material`, A.npd, { note: 'x' });
      assert.equal(late.status, 400);
      assert.match(late.body.error, /not waiting for material/);
    });

    // ======================================================================= old flow
    section('Old challan flow: /debug deleted, legacy routes answer 410');
    await test('the six /debug endpoints are gone (404)', async () => {
      const base = '/api/external-jobwork-materials';
      for (const [method, p] of [['GET', '/debug/all-transactions'], ['GET', '/debug/complete-state'], ['GET', '/debug/transactions/1'],
        ['GET', `/debug/challans/${coA}`], ['POST', '/debug/reset-challan/1'], ['GET', `/debug/fix-store-incharge/${coA}`], ['POST', `/debug/fix-store-incharge/${coA}`]]) {
        assert.equal((await call(method, base + p, A.store_incharge)).status, 404, `${method} ${p}`);
      }
      assert.equal(fs.readFileSync(path.join(__dirname, '../routes/external-jobwork-materials.js'), 'utf8').includes('/debug/'), false);
    });
    await test('the challan-based routes answer 410 Gone unless LEGACY_EXTERNAL_FLOW=1; the issue-to-floor routes still work', async () => {
      const base = '/api/external-jobwork-materials';
      const gone = [['GET', `/inventory/1/${coA}`], ['GET', `/notifications/accountant/${A.accountant.id}/${coA}`], ['POST', '/create-challan'], ['POST', '/notify-material-arrival'],
        ['GET', `/challans/store-incharge/${A.store_incharge.id}/${coA}`], ['GET', '/challan-details/1'], ['POST', '/receive-challan/1']];
      for (const [method, p] of gone) {
        const r = await call(method, base + p, A.store_incharge, method === 'POST' ? {} : undefined);
        assert.equal(r.status, 410, `${method} ${p}`);
        assert.match(r.body.error, /replaced by customer material inward/);
      }
      assert.equal((await call('GET', `${base}/requests/pending`, A.store_incharge)).status, 200);
      assert.equal((await call('GET', `${base}/history`, A.store_incharge)).status, 200);
    });
    await test('with LEGACY_EXTERNAL_FLOW=1 the old routes are reachable again (flip both flags to bring the old screens back)', async () => {
      await h.startExtraServer(3923, { LEGACY_EXTERNAL_FLOW: '1' });
      const res = await fetch(`http://localhost:3923/api/external-jobwork-materials/challans/store-incharge/${A.store_incharge.id}/${coA}`, { headers: { Authorization: `Bearer ${h.token(A.store_incharge)}` } });
      assert.notEqual(res.status, 410);
      assert.equal(res.status, 200);
      const create = await fetch('http://localhost:3923/api/external-jobwork-materials/create-challan', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${h.token(A.accountant)}` }, body: '{}' });
      assert.equal(create.status, 400); // reaches the old handler, which wants its fields
    });
    await test('front end: the old Receipt screen has no /debug calls, and one flag hides the old external screens (default hidden)', async () => {
      const root = path.join(__dirname, '../..');
      const receipt = fs.readFileSync(path.join(root, 'src/screens/ExternalJobworkReceiptScreen.js'), 'utf8');
      assert.equal(/debug/.test(receipt), false);
      assert.match(fs.readFileSync(path.join(root, 'src/config/features.js'), 'utf8'), /SHOW_LEGACY_EXTERNAL_FLOW = false/);
      for (const f of ['AccountantDashboard', 'NPDDashboard', 'StoreInchargeDashboard']) {
        const src = fs.readFileSync(path.join(root, `src/screens/dashboards/${f}.js`), 'utf8');
        assert.match(src, /SHOW_LEGACY_EXTERNAL_FLOW/, f);
      }
    });
  } catch (err) {
    console.error('\nFatal:', err);
    process.exitCode = 1;
  } finally {
    await h.finish();
  }
})();
