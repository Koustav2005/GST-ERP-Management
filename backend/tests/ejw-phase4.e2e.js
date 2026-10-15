// External Job Work v2 - Phase 4 backend: printed documents (delivery challan, tax invoice, internal DC), place of supply,
// process text, ready-for-dispatch list, company profile, 409 "add receipt instead" payload.
// Run from backend/:  npm run test:ejw4
const { createHarness } = require('./helpers/harness');

const h = createHarness({ port: 3925, name: 'ejw-phase4' });
const { tag, pool, assert, call, test, section } = h;

const sql = async (text, params) => (await pool.query(text, params)).rows;
const p2 = (n) => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; };

// Download a PDF with a token. Returns { status, type, buffer, text } where text is every string drawn on the pages.
// pdfkit writes each drawn string as [<hex> kerning <hex> ...] TJ; `text` is all of them joined with nothing between,
// so a label drawn next to its value ("Place of Supply: " + "Karnataka (29)") reads as one phrase.
function pdfText(buffer) {
  const raw = buffer.toString('latin1');
  const parts = [];
  for (const m of raw.matchAll(/\[((?:\s*<[0-9a-fA-F]*>\s*-?[\d.]*)+)\]\s*TJ/g)) {
    parts.push([...m[1].matchAll(/<([0-9a-fA-F]*)>/g)].map((t) => Buffer.from(t[1], 'hex').toString('latin1')).join(''));
  }
  return parts.join('');
}

async function getPdf(urlPath, user) {
  const res = await fetch(`http://localhost:3925${urlPath}`, { headers: { Authorization: `Bearer ${h.token(user)}` } });
  const buffer = Buffer.from(await res.arrayBuffer());
  const raw = buffer.toString('latin1');
  return { status: res.status, type: res.headers.get('content-type'), buffer, text: pdfText(buffer), json: res.status === 200 ? null : (() => { try { return JSON.parse(raw); } catch (e) { return null; } })() };
}

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
    'DELETE FROM jobwork_dc_items WHERE dc_id IN (SELECT id FROM jobwork_dcs WHERE company_id = ANY($1))',
    'DELETE FROM jobwork_dcs WHERE company_id = ANY($1)',
    'DELETE FROM job_work_items WHERE job_work_id IN (SELECT id FROM job_work_requests WHERE company_id = ANY($1))',
    'DELETE FROM job_work_requests WHERE company_id = ANY($1)',
    'DELETE FROM master_vendors WHERE company_id = ANY($1)',
    'DELETE FROM master_customers WHERE company_id = ANY($1)',
    'DELETE FROM doc_sequences WHERE company_id = ANY($1)',
    'DELETE FROM stock_items WHERE company_id = ANY($1)'
  ];
  for (const s of steps) await pool.query(s, ids).catch((e) => console.log('  cleanup warn:', s.slice(0, 50), e.message));
}

(async () => {
  let coA; let coB; let A; let B;
  try {
    coA = await h.mkCompany('Print Works Pvt Ltd', { gst_number: '29AAAAA0000A1Z5', state: 'Karnataka' });
    coB = await h.mkCompany('B', { gst_number: '29BBBBB0000A1Z5', state: 'Karnataka' });
    await sql('UPDATE companies SET address = $2 WHERE id = $1', [coA, '12 Industrial Layout, Peenya, Bengaluru 560058']);
    A = {};
    for (const role of ['management', 'accountant', 'store_incharge', 'project_manager', 'npd', 'worker']) A[role] = await h.mkUser(role, coA);
    B = {};
    for (const role of ['accountant', 'store_incharge']) B[role] = await h.mkUser(role, coB);
    h.onCleanup(() => wipe(h.created.companies));
    await h.startServer();

    const mkCust = async (name, extra) => (await sql(
      'INSERT INTO master_customers (company_id, name, gstin, state, billing_address, works_address, is_active) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id',
      [coA, `${tag} ${name}`, extra.gstin, extra.state, extra.billing, extra.works]))[0].id;
    const cKA = await mkCust('AKE Engineering', { gstin: '29BBBBB1111B1Z5', state: 'Karnataka', billing: '5 Billing Road, Bengaluru', works: '77 Works Lane, Tumakuru' });
    const cTN = await mkCust('Chennai Castings', { gstin: '33CCCCC2222C1Z5', state: 'Tamil Nadu', billing: '9 Anna Salai, Chennai', works: '9 Anna Salai, Chennai' });
    const stock = (await sql("INSERT INTO stock_items (company_id, name, hsn, unit) VALUES ($1, $2, '8483', 'pcs') RETURNING id", [coA, `${tag} Shaft`]))[0].id;

    let n = 0;
    async function flow(customer, { po = 'PO-77', qty = '100', unitValue = '2000' } = {}) {
      n += 1;
      const dcNo = `P4-${tag.slice(-6)}-${n}`;
      const inw = await call('POST', '/api/ejw/inwards', A.store_incharge, { customer_id: customer, customer_dc_no: dcNo, customer_dc_date: '2026-10-01',
        received_date: today(), items: [{ stock_item_id: stock, qty, unit_value: unitValue }] });
      assert.equal(inw.status, 201, JSON.stringify(inw.body));
      const full = (await call('GET', `/api/ejw/inwards/${inw.body.inward.id}`, A.store_incharge)).body.inward;
      const itemId = full.items[0].id;
      const wo = await call('POST', '/api/ejw/work-orders', A.project_manager, { inward_item_ids: [itemId], description: 'Hard chrome plating' });
      assert.equal(wo.status, 201, JSON.stringify(wo.body));
      const woId = wo.body.work_order.id;
      if (po) await call('PUT', `/api/ejw/work-orders/${woId}`, A.project_manager, { customer_po_no: po });
      const [row] = await sql('SELECT project_id FROM work_orders WHERE id = $1', [woId]);
      await sql('INSERT INTO project_workers (project_id, worker_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [row.project_id, A.worker.id]).catch(() => {});
      const rq = await call('POST', '/api/external-jobwork-materials/request', A.project_manager, { project_id: row.project_id, worker_id: A.worker.id,
        items: [{ ejw_inward_item_id: itemId, requested_quantity: qty }] });
      assert.equal((await call('POST', `/api/external-jobwork-materials/requests/${rq.body.requestId}/fulfill`, A.store_incharge, {})).status, 201);
      await sql("INSERT INTO work_order_documents (wo_id, kind, file_name, file_path) VALUES ($1, 'inspection_report', 'i.pdf', '/uploads/i.pdf')", [woId]);
      const cl = await call('POST', `/api/ejw/work-orders/${woId}/mark-ready`, A.project_manager, { items: [{ inward_item_id: itemId, qty }] });
      assert.equal((await call('POST', `/api/ejw/ready-notices/${cl.body.notice.id}/confirm`, A.store_incharge, {})).status, 200);
      return { woId, itemId, dcNo, inwardId: inw.body.inward.id };
    }
    const D = '/api/ejw/dispatches';
    const body = (f, extra = {}) => ({ wo_id: f.woId, items: [{ inward_item_id: f.itemId, qty: '100' }], job_charge: '112000', gst_rate_id: 2, ...extra });
    const issue = async (f, bodyExtra = {}, issueExtra = {}) => {
      const d = await call('POST', D, A.accountant, body(f, bodyExtra));
      assert.equal(d.status, 201, JSON.stringify(d.body));
      const r = await call('POST', `${D}/${d.body.dispatch.id}/issue`, A.accountant, { eway_bill_no: '123456789012', ...issueExtra });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      return r.body.dispatch;
    };

    // ======================================================================= 409 payload
    section('Duplicate customer DC: the 409 tells the app which inward to add a receipt to');
    const fKA = await flow(cKA);
    await test('re-entering the same customer DC no. + date gives 409 with the existing inward id and a code', async () => {
      const r = await call('POST', '/api/ejw/inwards', A.store_incharge, { customer_id: cKA, customer_dc_no: fKA.dcNo, customer_dc_date: '2026-10-01',
        received_date: today(), items: [{ stock_item_id: stock, qty: '1', unit_value: '10' }] });
      assert.equal(r.status, 409);
      assert.equal(r.body.code, 'DC_ALREADY_RECEIVED');
      assert.equal(r.body.inward_id, fKA.inwardId);
      assert.ok(/add a receipt/i.test(r.body.error));
    });

    await test('the stock item request list shows the customer and customer DC of an inwarded item', async () => {
      const dcNo = `REQ-${tag.slice(-6)}`;
      const inw = await call('POST', '/api/ejw/inwards', A.store_incharge, { customer_id: cKA, customer_dc_no: dcNo, customer_dc_date: '2026-10-02', received_date: today(),
        items: [{ request_stock_item: true, description: `${tag} Odd bracket`, unit: 'pcs', hsn: '7326', qty: '3', unit_value: '50' }] });
      assert.equal(inw.status, 201, JSON.stringify(inw.body));
      const list = await call('GET', '/api/jobwork-dcs/stock-item-requests?status=pending', A.accountant);
      assert.equal(list.status, 200);
      const row = list.body.requests.find((r) => r.requested_name === `${tag} Odd bracket`);
      assert.ok(row, 'request is listed');
      assert.equal(row.customer_name, `${tag} AKE Engineering`);
      assert.equal(row.customer_dc_no, dcNo);
    });

    // ======================================================================= ready list, place of supply
    section('Ready for dispatch list, process text, place of supply');
    await test('Accounts sees the work order with its dispatchable items and no blockers; Store/PM are refused (403)', async () => {
      const r = await call('GET', '/api/ejw/ready-for-dispatch', A.accountant);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      const wo = r.body.work_orders.find((w) => w.wo_id === fKA.woId);
      assert.ok(wo); assert.deepEqual(wo.blockers, []); assert.equal(Number(wo.items[0].dispatchable_qty), 100);
      assert.equal(wo.items[0].customer_dc_no, fKA.dcNo);
      assert.equal((await call('GET', '/api/ejw/ready-for-dispatch', A.store_incharge)).status, 403);
      assert.equal((await call('GET', '/api/ejw/ready-for-dispatch', A.project_manager)).status, 403);
      assert.equal((await call('GET', '/api/ejw/ready-for-dispatch', B.accountant)).body.work_orders.length, 0);
    });
    await test('a work order without a PO number shows the blocker in the list', async () => {
      const f = await flow(cKA, { po: null });
      const r = await call('GET', '/api/ejw/ready-for-dispatch', A.accountant);
      const wo = r.body.work_orders.find((w) => w.wo_id === f.woId);
      assert.ok(wo.blockers.some((b) => /PO number/i.test(b)));
    });
    await test('preview shows the place of supply and the process; issue stores them', async () => {
      const p = await call('POST', `${D}/preview`, A.accountant, body(fKA, { process_text: 'hard chrome plating' }));
      assert.deepEqual(p.body.place_of_supply, { state: 'Karnataka', code: '29' });
      assert.equal(p.body.process_text, 'hard chrome plating');
      const d = await issue(fKA, { process_text: 'hard chrome plating' });
      assert.equal(d.place_of_supply_state, 'Karnataka'); assert.equal(d.place_of_supply_code, '29'); assert.equal(d.process_text, 'hard chrome plating');
      fKA.dispatch = d;
    });
    await test('process defaults to the work order description; an interstate customer gets its own place of supply', async () => {
      const f = await flow(cTN);
      const d = await issue(f);
      assert.equal(d.process_text, 'Hard chrome plating');
      assert.equal(d.place_of_supply_state, 'Tamil Nadu'); assert.equal(d.place_of_supply_code, '33');
      f.dispatch = d; fKA.tn = f;
    });

    // ======================================================================= PDFs
    section('Printed documents');
    await test('delivery challan PDF: our details, customer works address, process, DC refs, items with HSN/qty/value, no GST', async () => {
      const r = await getPdf(`/api/ejw/dispatches/${fKA.dispatch.id}/delivery-challan.pdf`, A.accountant);
      assert.equal(r.status, 200); assert.equal(r.type, 'application/pdf');
      assert.equal(r.buffer.slice(0, 5).toString(), '%PDF-');
      for (const s of [`${tag} Print Works Pvt Ltd`, '12 Industrial Layout, Peenya', 'GSTIN: 29AAAAA0000A1Z5', 'DELIVERY CHALLAN', fKA.dispatch.dc_no, 'AKE Engineering',
        '77 Works Lane, Tumakuru', 'GSTIN: 29BBBBB1111B1Z5', 'return after hard chrome plating', fKA.dcNo, '8483', '100', '2,00,000.00', 'KA', '123456789012', 'Authorised Signatory']) {
        if (s === 'KA') continue;
        assert.ok(r.text.includes(s), `challan shows "${s}"`);
      }
      assert.ok(!/CGST|SGST|IGST|Taxable/.test(r.text), 'no GST on the challan');
    });
    await test('tax invoice PDF: place of supply, SAC, taxable value, CGST/SGST at 9%, total, words, DC and PO refs', async () => {
      const r = await getPdf(`/api/ejw/dispatches/${fKA.dispatch.id}/tax-invoice.pdf`, A.accountant);
      assert.equal(r.status, 200); assert.equal(r.buffer.slice(0, 5).toString(), '%PDF-');
      for (const s of ['TAX INVOICE', fKA.dispatch.invoice_no, 'Place of Supply: Karnataka (29)', '5 Billing Road, Bengaluru', 'GSTIN: 29BBBBB1111B1Z5', '998875', '1,12,000.00',
        'CGST @ 9%', 'SGST @ 9%', '10,080.00', '1,32,160.00', 'Amount in words: Rupees One Lakh Thirty Two Thousand One Hundred Sixty Only', fKA.dispatch.dc_no, 'PO-77']) {
        assert.ok(r.text.includes(s), `invoice shows "${s}"`);
      }
      assert.ok(!/IGST/.test(r.text));
    });
    await test('an interstate invoice shows IGST at the full rate and Tamil Nadu (33)', async () => {
      const r = await getPdf(`/api/ejw/dispatches/${fKA.tn.dispatch.id}/tax-invoice.pdf`, A.management);
      assert.equal(r.status, 200);
      assert.ok(r.text.includes('Place of Supply: Tamil Nadu (33)'));
      assert.ok(r.text.includes('IGST @ 18%') && r.text.includes('20,160.00'));
      assert.ok(!/CGST|SGST/.test(r.text.replace(/IGST/g, '')));
    });
    await test('Store may print the challan but not the invoice (403); PM and NPD neither', async () => {
      assert.equal((await getPdf(`/api/ejw/dispatches/${fKA.dispatch.id}/delivery-challan.pdf`, A.store_incharge)).status, 200);
      assert.equal((await getPdf(`/api/ejw/dispatches/${fKA.dispatch.id}/tax-invoice.pdf`, A.store_incharge)).status, 403);
      for (const u of [A.project_manager, A.npd]) {
        assert.equal((await getPdf(`/api/ejw/dispatches/${fKA.dispatch.id}/delivery-challan.pdf`, u)).status, 403);
        assert.equal((await getPdf(`/api/ejw/dispatches/${fKA.dispatch.id}/tax-invoice.pdf`, u)).status, 403);
      }
    });
    await test('another company gets 404; a draft cannot be printed (400); a cancelled dispatch is stamped CANCELLED', async () => {
      assert.equal((await getPdf(`/api/ejw/dispatches/${fKA.dispatch.id}/tax-invoice.pdf`, B.accountant)).status, 404);
      const f = await flow(cKA);
      const draft = (await call('POST', D, A.accountant, body(f))).body.dispatch;
      assert.equal((await getPdf(`/api/ejw/dispatches/${draft.id}/delivery-challan.pdf`, A.accountant)).status, 400);
      const issued = (await call('POST', `${D}/${draft.id}/issue`, A.accountant, { eway_bill_no: '123456789012' })).body.dispatch;
      assert.equal((await call('POST', `${D}/${issued.id}/cancel`, A.accountant, { reason: 'wrong customer' })).status, 200);
      const r = await getPdf(`/api/ejw/dispatches/${issued.id}/tax-invoice.pdf`, A.accountant);
      assert.equal(r.status, 200); assert.ok(r.text.includes('CANCELLED'));
    });
    await test('amount in words is right for lakhs, crores and paise', async () => {
      const { amountInWords } = require('../pdf/common');
      assert.equal(amountInWords('132160'), 'Rupees One Lakh Thirty Two Thousand One Hundred Sixty Only');
      assert.equal(amountInWords('1234567.89'), 'Rupees Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven and Eighty Nine Paise Only');
      assert.equal(amountInWords('20000000'), 'Rupees Two Crore Only');
      assert.equal(amountInWords('0.5'), 'Rupees Zero and Fifty Paise Only');
    });
    await test('a dispatch with many items runs onto a second page without losing rows', async () => {
      const items = [];
      for (let i = 0; i < 45; i += 1) items.push(`Row ${i + 1}`);
      // build a long challan straight from the template: 45 lines must all be present and span 2+ pages
      const buf = await require('../pdf/deliveryChallan').build({
        dc_no: 'SE/DC/0001', dc_date: '2026-10-14', status: 'issued', company: { name: 'X Ltd', address: 'Addr', gst_number: '29AAAAA0000A1Z5', state: 'Karnataka' },
        customer: { name: 'Cust', gstin: '29BBBBB1111B1Z5', state: 'Karnataka', billing_address: 'B' }, process_text: 'plating', component_value: '4500.00',
        items: items.map((d) => ({ description: d, hsn: '8483', qty: '1', unit: 'pcs', value: '100.00', customer_dc_no: 'C-1' }))
      });
      const raw = buf.toString('latin1');
      assert.ok((raw.match(/\/Type \/Page\b/g) || []).length >= 2, 'more than one page');
      const text = pdfText(buf);
      assert.ok(items.every((d) => text.includes(d)), 'every row is in the file');
    });

    section('Add customer material to an existing job');
    await test('PM adds stock to one of his jobs of the SAME customer; other customers, other PMs and already-assigned items are refused', async () => {
      const f = await flow(cKA, { po: 'PO-ADD' });
      const mkInward = async (customer) => {
        n += 1;
        const r = await call('POST', '/api/ejw/inwards', A.store_incharge, { customer_id: customer, customer_dc_no: `ADD-${tag.slice(-6)}-${n}`, customer_dc_date: '2026-10-03',
          received_date: today(), items: [{ stock_item_id: stock, qty: '5', unit_value: '100' }] });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        return (await call('GET', `/api/ejw/inwards/${r.body.inward.id}`, A.store_incharge)).body.inward.items[0].id;
      };
      const mine = await mkInward(cKA);
      const theirs = await mkInward(cTN);
      const url = `/api/ejw/work-orders/${f.woId}/add-items`;
      assert.equal((await call('POST', url, A.project_manager, { inward_item_ids: [theirs] })).status, 400, 'other customer');
      const pm2 = await h.mkUser('project_manager', coA);
      assert.equal((await call('POST', url, pm2, { inward_item_ids: [mine] })).status, 403, 'not his job');
      assert.equal((await call('POST', url, A.store_incharge, { inward_item_ids: [mine] })).status, 403);
      assert.equal((await call('POST', url, A.project_manager, { inward_item_ids: [] })).status, 400);
      assert.equal((await call('POST', url, B.accountant, { inward_item_ids: [mine] })).status, 403);
      const ok = await call('POST', url, A.project_manager, { inward_item_ids: [mine] });
      assert.equal(ok.status, 200, JSON.stringify(ok.body));
      assert.ok(ok.body.work_order.items.some((i) => i.id === mine));
      assert.equal((await call('POST', url, A.project_manager, { inward_item_ids: [mine] })).status, 409, 'already on a job');
      assert.equal(ok.body.work_order.items.some((i) => 'unit_value' in i), false, 'PM sees no money');
    });

    section('Internal DC PDF');
    await test('internal delivery challan PDF in the same style; Store and Accounts only', async () => {
      const vendor = (await sql("INSERT INTO master_vendors (name, company_id, gst_number, address) VALUES ($1, $2, '29DDDDD3333D1Z5', 'Vendor Street, Mysuru') RETURNING id", [`${tag} Plater`, coA]))[0].id;
      const jr = (await sql("INSERT INTO job_work_requests (company_id, job_id, job_work_type) VALUES ($1, $2, 'internal') RETURNING id", [coA, `${tag}J1`]).catch(async () => sql("INSERT INTO job_work_requests (company_id, job_id, job_work_type) VALUES ($1, $2, 'external') RETURNING id", [coA, `${tag}J1`])))[0].id;
      const jwi = (await sql("INSERT INTO job_work_items (job_work_id, material_name, quantity, unit) VALUES ($1, 'Flange', 5, 'pcs') RETURNING id", [jr]))[0].id;
      const dc = (await sql(
        "INSERT INTO jobwork_dcs (company_id, dc_number, dc_date, vendor_id, vendor_name, vendor_gstin, vendor_address, process, vehicle_number) VALUES ($1, $2, '2026-10-14', $3, $4, '29DDDDD3333D1Z5', 'Vendor Street, Mysuru', 'zinc plating', 'KA09ZZ1234') RETURNING id",
        [coA, `${tag}-DC1`, vendor, `${tag} Plater`]))[0].id;
      await sql("INSERT INTO jobwork_dc_items (dc_id, job_work_item_id, stock_item_id, description, hsn_code, quantity, unit, unit_value, total_value) VALUES ($1, $2, $3, 'Flange 200mm', '7307', 5, 'pcs', 100, 500)", [dc, jwi, stock]);
      const r = await getPdf(`/api/jobwork-dcs/${dc}/pdf`, A.accountant);
      assert.equal(r.status, 200, JSON.stringify(r.json)); assert.equal(r.type, 'application/pdf');
      for (const s of ['DELIVERY CHALLAN', `${tag}-DC1`, 'return after zinc plating', `${tag} Plater`, 'Vendor Street, Mysuru', 'Flange 200mm', '7307', '500.00', 'KA09ZZ1234', 'GSTIN: 29AAAAA0000A1Z5']) {
        assert.ok(r.text.includes(s), `internal DC shows "${s}"`);
      }
      assert.equal((await getPdf(`/api/jobwork-dcs/${dc}/pdf`, A.store_incharge)).status, 200);
      assert.equal((await getPdf(`/api/jobwork-dcs/${dc}/pdf`, A.project_manager)).status, 403);
      assert.equal((await getPdf(`/api/jobwork-dcs/${dc}/pdf`, B.accountant)).status, 404);
    });

    // ======================================================================= company profile
    section('Company profile (printed on every document)');
    await test('Accounts and Management read it; only Management writes; GSTIN is validated and sets the state', async () => {
      const g = await call('GET', '/api/ejw/company-profile', A.accountant);
      assert.equal(g.status, 200); assert.ok(g.body.company.address.includes('Peenya'));
      assert.equal((await call('GET', '/api/ejw/company-profile', A.store_incharge)).status, 403);
      assert.equal((await call('PUT', '/api/ejw/company-profile', A.accountant, { address: 'x' })).status, 403);
      assert.equal((await call('PUT', '/api/ejw/company-profile', A.management, { gst_number: 'BAD' })).status, 400);
      assert.equal((await call('PUT', '/api/ejw/company-profile', A.management, {})).status, 400);
      const ok = await call('PUT', '/api/ejw/company-profile', A.management, { address: 'New Address, Hosur Road', gst_number: '33AAAAA0000A1Z5' });
      assert.equal(ok.status, 200, JSON.stringify(ok.body));
      assert.equal(ok.body.company.state, 'Tamil Nadu');
      assert.equal(ok.body.company.address, 'New Address, Hosur Road');
    });
  } catch (err) {
    console.log('SUITE ERROR', err);
    process.exitCode = 1;
  } finally {
    await h.finish();
  }
})();
