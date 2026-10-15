// End-to-end test for /api/jobwork-dcs (Phase 2a). Run from backend/:  npm run test:jobwork-dcs
// Starts its own server on TEST_PORT, builds an isolated test company with fixtures,
// runs the checks, then deletes everything it created.

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
require('dotenv').config();

const TEST_PORT = 3917;
const BASE = `http://localhost:${TEST_PORT}/api/jobwork-dcs`;
const tag = `ZZTEST${Date.now()}`;

let server;
const ids = { users: {}, projects: [], requests: [], items: [] };
let passed = 0;
const failures = [];

const token = (user) => jwt.sign({ id: user.id, role: user.role, company_id: user.company_id }, process.env.JWT_SECRET, { expiresIn: '1h' });

async function call(method, path, user, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(user)}` },
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch (_) { /* empty body */ }
  return { status: res.status, body: json };
}

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures.push(name);
    console.log(`  FAIL ${name}\n       ${err.message.split('\n').slice(0, 6).join(' | ')}`);
  }
}

async function mkUser(role, companyId) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password, role, company_id, is_approved)
     VALUES ($1, $2, 'x', $3, $4, true) RETURNING id, role, company_id`,
    [`${tag} ${role}`, `${tag}.${role}.${companyId}.${Math.random().toString(36).slice(2, 8)}@test.invalid`, role, companyId]
  );
  return rows[0];
}

// A job work request with one item (the item is what goes on a DC).
async function mkItem(project, store, name, qty = 5) {
  const { rows: r } = await pool.query(
    `INSERT INTO job_work_requests
       (job_id, project_id, company_id, job_work_type, loaded_vehicle_weight, unloaded_vehicle_weight,
        actual_vehicle_weight, store_incharge_id, created_by)
     VALUES ($1, $2, $3, 'Shot Blasting', 100, 50, 50, $4, $5) RETURNING id`,
    [`${tag}-${ids.requests.length}`, project.id, project.company_id, store.id, ids.users.pm.id]
  );
  const { rows: i } = await pool.query(
    `INSERT INTO job_work_items (job_work_id, material_name, hsn, quantity, unit) VALUES ($1, $2, '7308', $3, 'pcs') RETURNING id`,
    [r[0].id, name, qty]
  );
  ids.requests.push(r[0].id);
  ids.items.push(i[0].id);
  return { requestId: r[0].id, itemId: i[0].id };
}

const requestStatus = async (requestId) =>
  (await pool.query('SELECT status FROM job_work_requests WHERE id = $1', [requestId])).rows[0].status;

async function setup() {
  const company = (await pool.query('INSERT INTO companies (name) VALUES ($1) RETURNING id', [`${tag} Co`])).rows[0].id;
  const other = (await pool.query('INSERT INTO companies (name) VALUES ($1) RETURNING id', [`${tag} Other`])).rows[0].id;
  ids.company = company;
  ids.otherCompany = other;
  for (const role of ['store_incharge', 'accountant', 'management']) ids.users[role] = await mkUser(role, company);
  ids.users.pm = await mkUser('project_manager', company);
  ids.users.otherAccountant = await mkUser('accountant', other);
  ids.users.otherStore = await mkUser('store_incharge', other);
  ids.users.store = ids.users.store_incharge;
  ids.users.acc = ids.users.accountant;

  for (const n of [1, 2]) {
    const p = (await pool.query(
      'INSERT INTO projects (name, company_id, created_by) VALUES ($1, $2, $3) RETURNING id, company_id',
      [`${tag} Project ${n}`, company, ids.users.pm.id]
    )).rows[0];
    ids.projects.push(p);
    await pool.query('UPDATE projects SET po_number = $2 WHERE id = $1', [p.id, `PO-${tag}-${n}`]);
  }
  ids.vendor = (await pool.query(
    `INSERT INTO master_vendors (name, gst_number, address, state, pincode, company_id)
     VALUES ($1, '29ABCDE1234F1Z5', '12 Industrial Area', 'Karnataka', '560058', $2) RETURNING id`,
    [`${tag} Vendor B`, company]
  )).rows[0].id;
  await pool.query('UPDATE companies SET state = $2 WHERE id = $1', [company, 'Karnataka']);
  const mkVendor = async (label, state) => (await pool.query(
    'INSERT INTO master_vendors (name, state, company_id) VALUES ($1, $2, $3) RETURNING id',
    [`${tag} Vendor ${label}`, state, company]
  )).rows[0].id;
  ids.vendorC = await mkVendor('C', ' KARNATAKA ');   // same state, different case/spacing
  ids.vendorD = await mkVendor('D', 'Tamil Nadu');     // interstate
  ids.vendorE = await mkVendor('E', null);             // state not set
  const mkGstVendor = async (label, gstin, state) => (await pool.query(
    'INSERT INTO master_vendors (name, state, gst_number, company_id) VALUES ($1, $2, $3, $4) RETURNING id',
    [`${tag} Vendor ${label}`, state, gstin, company]
  )).rows[0].id;
  ids.vendorG29 = await mkGstVendor('G29', '29ABCDE1234F1Z5', 'Tamil Nadu'); // GSTIN says Karnataka, text disagrees
  ids.vendorG33 = await mkGstVendor('G33', '33ABCDE1234F1Z5', 'Karnataka');  // GSTIN says Tamil Nadu, text disagrees
  ids.vendorGbad = await mkGstVendor('Gbad', 'XXABCDE1234F1Z5', 'Karnataka'); // unusable prefix -> text fallback
  ids.users.pm2 = await mkUser('project_manager', company);
  await pool.query('UPDATE projects SET assigned_to = $1 WHERE id = $2', [ids.users.pm.id, ids.projects[0].id]);
  await pool.query('UPDATE projects SET assigned_to = $1 WHERE id = $2', [ids.users.pm2.id, ids.projects[1].id]);
  ids.rate5 = (await pool.query('SELECT id FROM gst_rates WHERE rate = 5')).rows[0].id;
  ids.rate18 = (await pool.query('SELECT id FROM gst_rates WHERE rate = 18')).rows[0].id;
  const bom = async (projectId, name, hsn) => (await pool.query(
    'INSERT INTO bill_of_materials (project_id, material_name, quantity, unit, hsn) VALUES ($1, $2, 4, $3, $4) RETURNING id', [projectId, name, 'pcs', hsn])).rows[0].id;
  ids.bomRow = await bom(ids.projects[0].id, `${tag} Support Rod`, '7308');
  ids.bomRow2 = await bom(ids.projects[0].id, `${tag} Other Rod`, null);
  ids.bomRowP2 = await bom(ids.projects[1].id, `${tag} P2 Rod`, '7308');
  const rev = (await pool.query('INSERT INTO revisions (project_id, revision_number, created_by) VALUES ($1, 1, $2) RETURNING id', [ids.projects[0].id, ids.users.pm.id])).rows[0].id;
  ids.revRow = (await pool.query("INSERT INTO revision_bom_items (revision_id, serial_number, material_name, quantity, unit) VALUES ($1, 1, $2, 2, 'pcs') RETURNING id", [rev, `${tag} Rev Bracket`])).rows[0].id;
}

async function cleanup() {
  const q = (sql, params) => pool.query(sql, params).catch((e) => console.log('  cleanup warn:', e.message));
  const userIds = [...Object.values(ids.users)].map((u) => u.id);
  const projectIds = ids.projects.map((p) => p.id);
  const companies = [ids.company, ids.otherCompany];
  // return items reference dc items without a cascade (restrict is intended for GST records),
  // so they go first; then returns, then the DCs (which cascade items and movements).
  await q('DELETE FROM jobwork_return_items WHERE return_id IN (SELECT r.id FROM jobwork_returns r JOIN jobwork_dcs d ON d.id = r.dc_id WHERE d.company_id = ANY($1))', [companies]);
  await q('DELETE FROM jobwork_returns WHERE dc_id IN (SELECT id FROM jobwork_dcs WHERE company_id = ANY($1))', [companies]);
  await q('DELETE FROM jobwork_dcs WHERE company_id = ANY($1)', [companies]);
  await q('DELETE FROM job_work_requests WHERE id = ANY($1)', [ids.requests]); // cascades job_work_items
  await q('DELETE FROM project_status_history WHERE project_id = ANY($1)', [projectIds]);
  await q('DELETE FROM notifications WHERE user_id = ANY($1)', [userIds]);
  await q('DELETE FROM stock_item_requests WHERE company_id = ANY($1)', [[ids.company, ids.otherCompany]]);
  await q('DELETE FROM stock_items WHERE company_id = ANY($1)', [[ids.company, ids.otherCompany]]);
  await q('DELETE FROM revision_bom_items WHERE revision_id IN (SELECT id FROM revisions WHERE project_id = ANY($1))', [projectIds]);
  await q('DELETE FROM revisions WHERE project_id = ANY($1)', [projectIds]);
  await q('DELETE FROM bill_of_materials WHERE project_id = ANY($1)', [projectIds]);
  await q('DELETE FROM projects WHERE id = ANY($1)', [projectIds]);
  await q('DELETE FROM master_vendors WHERE company_id = ANY($1)', [[ids.company, ids.otherCompany]]);
  await q('DELETE FROM users WHERE id = ANY($1)', [userIds]);
  await q('DELETE FROM companies WHERE id = ANY($1)', [[ids.company, ids.otherCompany]]);
}

function startServer() {
  return new Promise((resolve, reject) => {
    server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(TEST_PORT) }, cwd: __dirname + '/..' });
    const timer = setTimeout(() => reject(new Error('server did not start')), 15000);
    server.stdout.on('data', (d) => { if (String(d).includes('Server running')) { clearTimeout(timer); resolve(); } });
    server.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
    server.on('exit', (code) => { if (code) reject(new Error(`server exited ${code}`)); });
  });
}

async function run() {
  const { store, acc, pm, pm2, management, otherAccountant, otherStore } = ids.users;
  const [p1, p2] = ids.projects;

  let stockPlate, stockBeam;
  const big = await mkItem(p1, store, `${tag} Plate`, 10);
  const small = await mkItem(p2, store, `${tag} Beam`, 3);
  const noStock = await mkItem(p1, store, `${tag} Unmapped`, 2);

  console.log('\nRoles');
  await test('store cannot create a stock item (403)', async () => {
    const r = await call('POST', '/stock-items', store, { name: 'X', unit: 'pcs' });
    assert.equal(r.status, 403);
  });
  await test('accountant cannot create a DC (403)', async () => {
    const r = await call('POST', '/', acc, { vendor_id: ids.vendor, items: [] });
    assert.equal(r.status, 403);
  });
  await test('management can read but not write (GET 200, POST 403)', async () => {
    assert.equal((await call('GET', '/', management)).status, 200);
    assert.equal((await call('POST', '/', management, { vendor_id: ids.vendor, items: [] })).status, 403);
  });
  await test('store cannot approve (403)', async () => {
    assert.equal((await call('POST', '/1/approve', store, {})).status, 403);
  });

  console.log('\nStock items');
  await test('accountant creates stock items', async () => {
    let r = await call('POST', '/stock-items', acc, { name: `${tag} Plate`, hsn: '7208', unit: 'pcs' });
    assert.equal(r.status, 201);
    stockPlate = r.body.stock_item;
    r = await call('POST', '/stock-items', acc, { name: `${tag} Beam`, hsn: '7216', unit: 'pcs' });
    stockBeam = r.body.stock_item;
    assert.ok(stockBeam.id);
  });
  await test('duplicate name, different case (409)', async () => {
    const r = await call('POST', '/stock-items', acc, { name: `${tag.toLowerCase()} PLATE`, unit: 'pcs' });
    assert.equal(r.status, 409);
  });
  await test('stock item search is company scoped', async () => {
    const mine = await call('GET', `/stock-items?search=${tag}`, store);
    assert.equal(mine.body.stock_items.length, 2);
    const theirs = await call('GET', `/stock-items?search=${tag}`, otherAccountant);
    assert.equal(theirs.body.stock_items.length, 0);
  });
  await test('store request notifies the accountant', async () => {
    const r = await call('POST', '/stock-items/request', store, { name: `${tag} Unmapped`, unit: 'pcs' });
    assert.equal(r.status, 201);
    const n = await pool.query(`SELECT data FROM notifications WHERE user_id = $1 AND type = 'jobwork_stock_item_request' AND data->>'request_id' = $2`, [acc.id, String(r.body.request.id)]);
    assert.equal(n.rowCount, 1);
  });

  console.log('\nPending items');
  await test('pending items grouped by project, all PMs', async () => {
    const r = await call('GET', '/pending-items', store);
    const mine = r.body.projects.filter((g) => [p1.id, p2.id].includes(g.project_id));
    assert.equal(mine.length, 2);
    assert.equal(mine.find((g) => g.project_id === p1.id).items.length, 2);
  });

  console.log('\nCreate DC');
  await test('missing stock item -> 400 "create stock item first"', async () => {
    const r = await call('POST', '/', store, {
      vendor_id: ids.vendor, items: [{ job_work_item_id: noStock.itemId, quantity: 2, unit_value: '100' }]
    });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /create stock item first/i);
  });
  await test('quantity must equal the request item quantity', async () => {
    const r = await call('POST', '/', store, {
      vendor_id: ids.vendor, items: [{ job_work_item_id: big.itemId, stock_item_id: stockPlate.id, quantity: 4, unit_value: '100' }]
    });
    assert.equal(r.status, 400);
  });
  await test('vendor from another company is rejected (404)', async () => {
    const r = await call('POST', '/', otherStore, { vendor_id: ids.vendor, items: [] });
    assert.equal(r.status, 404);
  });

  let dcBig;
  await test('happy path: DC over 2 projects, auto number, snapshot, hsn from stock item', async () => {
    const r = await call('POST', '/', store, {
      vendor_id: ids.vendor, process: 'Shot Blasting', vehicle_number: 'KA01AB1234',
      loaded_vehicle_weight: 1200, unloaded_vehicle_weight: 800,
      items: [
        { job_work_item_id: big.itemId, stock_item_id: stockPlate.id, quantity: 10, unit_value: '6000' },
        { job_work_item_id: small.itemId, stock_item_id: stockBeam.id, quantity: 3, unit_value: '1500.50' }
      ]
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    dcBig = r.body.dc;
    assert.match(dcBig.dc_number, /^SE\/DC\/\d{4}$/);
    assert.equal(dcBig.status, 'dc_created');
    assert.equal(dcBig.vendor_gstin, '29ABCDE1234F1Z5');
    assert.match(dcBig.vendor_address, /Karnataka/);
    assert.equal(dcBig.items.length, 2);
    assert.equal(dcBig.items.find((i) => i.job_work_item_id === big.itemId).hsn_code, '7208');
    assert.equal(Number(dcBig.total_value), 64501.5);
    assert.equal(await requestStatus(big.requestId), 'dc_created');
    assert.equal(await requestStatus(small.requestId), 'dc_created');
  });
  await test('history written for every project on the DC; accountant notified', async () => {
    const h = await pool.query(
      `SELECT DISTINCT project_id FROM project_status_history WHERE project_id = ANY($1) AND new_status = 'Job Work: dc_created'`,
      [[p1.id, p2.id]]
    );
    assert.equal(h.rowCount, 2);
    const n = await pool.query(`SELECT 1 FROM notifications WHERE user_id = $1 AND type = 'jobwork_dc_pending'`, [acc.id]);
    assert.ok(n.rowCount >= 1);
  });
  await test('item already on a DC -> 409', async () => {
    const r = await call('POST', '/', store, {
      vendor_id: ids.vendor, items: [{ job_work_item_id: big.itemId, stock_item_id: stockPlate.id, quantity: 10, unit_value: '1' }]
    });
    assert.equal(r.status, 409);
    assert.match(r.body.error, /already on DC/);
  });
  await test('pending items no longer lists items on a DC', async () => {
    const r = await call('GET', '/pending-items', store);
    const all = r.body.projects.flatMap((g) => g.items.map((i) => i.job_work_item_id));
    assert.ok(!all.includes(big.itemId));
    assert.ok(all.includes(noStock.itemId));
  });

  console.log('\nDC number');
  const extra = [];
  for (let n = 0; n < 4; n += 1) extra.push(await mkItem(p1, store, `${tag} Parallel ${n}`, 1));
  await test('4 parallel creates get 4 distinct numbers', async () => {
    const results = await Promise.all(extra.map((e) => call('POST', '/', store, {
      vendor_id: ids.vendor, items: [{ job_work_item_id: e.itemId, stock_item_id: stockPlate.id, quantity: 1, unit_value: '10' }]
    })));
    assert.ok(results.every((r) => r.status === 201), JSON.stringify(results.map((r) => r.body)));
    assert.equal(new Set(results.map((r) => r.body.dc.dc_number)).size, 4);
  });
  const manual = await mkItem(p2, store, `${tag} Manual`, 1);
  await test('dc_number override accepted, duplicate override -> 409', async () => {
    const payload = (num, itemId) => ({
      vendor_id: ids.vendor, dc_number: num,
      items: [{ job_work_item_id: itemId, stock_item_id: stockPlate.id, quantity: 1, unit_value: '10' }]
    });
    const ok = await call('POST', '/', store, payload(`${tag}/MANUAL`, manual.itemId));
    assert.equal(ok.status, 201);
    assert.equal(ok.body.dc.dc_number, `${tag}/MANUAL`);
    const spare = await mkItem(p2, store, `${tag} Manual2`, 1);
    const dup = await call('POST', '/', store, payload(`${tag}/MANUAL`, spare.itemId));
    assert.equal(dup.status, 409);
  });

  console.log('\nApprove / reject');
  await test('approve above 50,000 without e-way bill -> 400', async () => {
    const r = await call('POST', `/${dcBig.id}/approve`, acc, {});
    assert.equal(r.status, 400);
    assert.match(r.body.error, /e-way/i);
  });
  await test('approve above 50,000 with e-way bill -> approved, request status approved', async () => {
    const r = await call('POST', `/${dcBig.id}/approve`, acc, { eway_bill_no: '271234567890' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.dc.status, 'approved');
    assert.equal(r.body.dc.eway_bill_no, '271234567890');
    assert.equal(r.body.dc.approved_by, acc.id);
    assert.equal(await requestStatus(big.requestId), 'approved');
  });
  await test('edit after approval -> 400', async () => {
    const r = await call('PUT', `/${dcBig.id}`, store, { process: 'changed' });
    assert.equal(r.status, 400);
  });
  await test('approve twice -> 400 (invalid transition)', async () => {
    assert.equal((await call('POST', `/${dcBig.id}/approve`, acc, { eway_bill_no: '271234567890' })).status, 400);
  });
  await test('reject after approval -> 400', async () => {
    assert.equal((await call('POST', `/${dcBig.id}/reject`, acc, { reason: 'late' })).status, 400);
  });

  const rej = await mkItem(p1, store, `${tag} Reject me`, 2);
  let dcSmall;
  await test('reject needs a reason; rejected DC returns to Store', async () => {
    const created = await call('POST', '/', store, {
      vendor_id: ids.vendor, items: [{ job_work_item_id: rej.itemId, stock_item_id: stockPlate.id, quantity: 2, unit_value: '100' }]
    });
    dcSmall = created.body.dc;
    assert.equal((await call('POST', `/${dcSmall.id}/reject`, acc, {})).status, 400);
    const r = await call('POST', `/${dcSmall.id}/reject`, acc, { reason: 'Wrong value' });
    assert.equal(r.status, 200);
    assert.equal(r.body.dc.status, 'rejected');
    assert.equal(r.body.dc.rejection_reason, 'Wrong value');
    assert.equal(await requestStatus(rej.requestId), 'dc_created');
    const n = await pool.query(`SELECT 1 FROM notifications WHERE user_id = $1 AND type = 'jobwork_dc_rejected'`, [store.id]);
    assert.equal(n.rowCount, 1);
  });
  await test('editing a rejected DC resubmits it (dc_created)', async () => {
    const r = await call('PUT', `/${dcSmall.id}`, store, { vehicle_number: 'KA05ZZ9999' });
    assert.equal(r.status, 200);
    assert.equal(r.body.dc.status, 'dc_created');
    assert.equal(r.body.dc.rejection_reason, null);
    assert.equal(r.body.dc.vehicle_number, 'KA05ZZ9999');
  });
  await test('approve at or below 50,000 works without e-way bill', async () => {
    const r = await call('POST', `/${dcSmall.id}/approve`, acc, {});
    assert.equal(r.status, 200);
    assert.equal(r.body.dc.eway_bill_no, null);
  });

  console.log('\nScoping and filters');
  await test('another company cannot read the DC (404)', async () => {
    assert.equal((await call('GET', `/${dcBig.id}`, otherAccountant)).status, 404);
  });
  await test('another company cannot approve the DC (404)', async () => {
    assert.equal((await call('POST', `/${dcBig.id}/approve`, otherAccountant, { eway_bill_no: '271234567890' })).status, 404);
  });
  await test('list filters: status, vendor, project, date', async () => {
    const byStatus = await call('GET', '/?status=approved', acc);
    assert.ok(byStatus.body.dcs.every((d) => d.status === 'approved') && byStatus.body.dcs.length === 2);
    assert.equal((await call('GET', `/?vendor_id=${ids.vendor}&project_id=${p2.id}`, acc)).body.dcs.length >= 2, true);
    assert.equal((await call('GET', '/?from=2999-01-01', acc)).body.dcs.length, 0);
    assert.equal((await call('GET', '/?status=bogus', acc)).status, 400);
  });
  await test('pm is not allowed on DC routes (403)', async () => {
    assert.equal((await call('GET', '/', pm)).status, 403);
  });

  // ---------------------------------------------------------------- Phase 2b helpers
  const stock = stockPlate;
  async function mkDc(vendorId, qty, unitValue = '100', project = p1) {
    const it = await mkItem(project, store, `${tag} item ${ids.items.length}`, qty);
    const r = await call('POST', '/', store, {
      vendor_id: vendorId, items: [{ job_work_item_id: it.itemId, stock_item_id: stock.id, quantity: qty, unit_value: unitValue }]
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return { dc: r.body.dc, it, dcItemId: r.body.dc.items[0].id };
  }
  const approve = (dc) => call('POST', `/${dc.id}/approve`, acc, { eway_bill_no: '271234567890' });
  async function mkDispatched(vendorId, qty, unitValue, project) {
    const made = await mkDc(vendorId, qty, unitValue, project);
    assert.equal((await approve(made.dc)).status, 200);
    const d = await call('POST', `/${made.dc.id}/dispatch`, store, {});
    assert.equal(d.status, 200, JSON.stringify(d.body));
    return made;
  }
  const ret = (dcId, vendorId, dcItemId, qty, extra = {}) =>
    call('POST', `/${dcId}/returns`, store, { vendor_id: vendorId, items: [{ dc_item_id: dcItemId, quantity_received: qty }], ...extra });
  const dcRow = async (id) => (await pool.query('SELECT * FROM jobwork_dcs WHERE id = $1', [id])).rows[0];

  console.log('--- Dates');
  await test('DATES: a DC dated 2026-10-14 reads back as 2026-10-14 everywhere (no timezone shift); so do return and invoice dates', async () => {
    const it = await mkItem(p1, store, `${tag} date item`, 2);
    const created = await call('POST', '/', store, { vendor_id: ids.vendor, dc_date: '2026-10-14', items: [{ job_work_item_id: it.itemId, stock_item_id: stock.id, quantity: 2, unit_value: '10' }] });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.dc.id;
    assert.equal(created.body.dc.dc_date, '2026-10-14');
    assert.equal((await call('GET', `/${id}`, store)).body.dc.dc_date, '2026-10-14');
    assert.equal((await call('GET', '/', store)).body.dcs.find((d) => d.id === id).dc_date, '2026-10-14');
    assert.equal((await pool.query('SELECT dc_date::text AS d FROM jobwork_dcs WHERE id = $1', [id])).rows[0].d, '2026-10-14');
    assert.equal((await approve({ id })).status, 200);
    assert.equal((await call('POST', `/${id}/dispatch`, store, {})).status, 200);
    const detail = (await call('GET', `/${id}`, store)).body.dc;
    const r = await ret(id, ids.vendor, detail.items[0].id, '2', { vendor_dc_no: 'V1', vendor_dc_date: '2026-10-15', invoice_no: 'DATE-1', invoice_date: '2026-10-16' });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.deepEqual([r.body.return.vendor_dc_date, r.body.return.invoice_date], ['2026-10-15', '2026-10-16']);
    const rows = (await call('GET', `/vendor-invoices?dc_id=${id}`, acc)).body.invoices;
    assert.deepEqual([rows[0].vendor_dc_date, rows[0].invoice_date], ['2026-10-15', '2026-10-16']);
  });
  console.log('\nFix 1: e-way bill rule (value OR interstate)');
  await test('interstate vendor needs e-way bill even for a tiny DC', async () => {
    const m = await mkDc(ids.vendorD, 1, '10');
    const r = await call('POST', `/${m.dc.id}/approve`, acc, {});
    assert.equal(r.status, 400);
    assert.match(r.body.error, /interstate/i);
    assert.equal((await call('POST', `/${m.dc.id}/approve`, acc, { eway_bill_no: '271234567890' })).status, 200);
  });
  await test('state compare is case/space-insensitive (" KARNATAKA " vs Karnataka)', async () => {
    const m = await mkDc(ids.vendorC, 1, '10');
    assert.equal((await call('POST', `/${m.dc.id}/approve`, acc, {})).status, 200);
  });
  await test('vendor state missing -> e-way required', async () => {
    const m = await mkDc(ids.vendorE, 1, '10');
    assert.equal((await call('POST', `/${m.dc.id}/approve`, acc, {})).status, 400);
  });
  await test('company state missing -> e-way required', async () => {
    const m = await mkDc(ids.vendor, 1, '10');
    await pool.query('UPDATE companies SET state = NULL WHERE id = $1', [ids.company]);
    const r = await call('POST', `/${m.dc.id}/approve`, acc, {});
    await pool.query("UPDATE companies SET state = 'Karnataka' WHERE id = $1", [ids.company]);
    assert.equal(r.status, 400);
  });

  console.log('\nState from GSTIN prefix, 12-digit e-way bill');
  await test('vendor GSTIN 33 vs company state Karnataka -> interstate (GSTIN beats the conflicting text)', async () => {
    const m = await mkDc(ids.vendorG33, 1, '10');
    const r = await call('POST', `/${m.dc.id}/approve`, acc, {});
    assert.equal(r.status, 400);
    assert.match(r.body.error, /tamil nadu/i);
  });
  await test('vendor GSTIN 29 vs company Karnataka -> same state, no e-way needed (text says Tamil Nadu but GSTIN wins)', async () => {
    const m = await mkDc(ids.vendorG29, 1, '10');
    assert.equal((await call('POST', `/${m.dc.id}/approve`, acc, {})).status, 200);
  });
  await test('unusable GSTIN prefix falls back to the state text', async () => {
    const m = await mkDc(ids.vendorGbad, 1, '10');
    assert.equal((await call('POST', `/${m.dc.id}/approve`, acc, {})).status, 200);
  });
  await test('company GSTIN 33 makes vendor GSTIN 33 intrastate and 29 interstate', async () => {
    await pool.query("UPDATE companies SET gst_number = '33AAAAA0000A1Z5' WHERE id = $1", [ids.company]);
    try {
      const same = await mkDc(ids.vendorG33, 1, '10');
      assert.equal((await call('POST', `/${same.dc.id}/approve`, acc, {})).status, 200);
      const diff = await mkDc(ids.vendorG29, 1, '10');
      assert.equal((await call('POST', `/${diff.dc.id}/approve`, acc, {})).status, 400);
    } finally {
      await pool.query('UPDATE companies SET gst_number = NULL WHERE id = $1', [ids.company]);
    }
  });
  await test('GSTIN vs state text (mixed): company GSTIN 29 and vendor text "Karnataka" are the same state', async () => {
    await pool.query("UPDATE companies SET gst_number = '29AAAAA0000A1Z5', state = NULL WHERE id = $1", [ids.company]);
    try {
      const m = await mkDc(ids.vendor, 1, '10'); // vendor B: text Karnataka, no GSTIN
      assert.equal((await call('POST', `/${m.dc.id}/approve`, acc, {})).status, 200);
    } finally {
      await pool.query("UPDATE companies SET gst_number = NULL, state = 'Karnataka' WHERE id = $1", [ids.company]);
    }
  });
  await test('unknown state still refuses a job charge (vendor without GSTIN or state)', async () => {
    const r = await call('POST', '/tax-preview', store, { vendor_id: ids.vendorE, job_charge: '100', gst_rate_id: ids.rate18 });
    assert.equal(r.status, 400);
  });
  await test('e-way bill must be exactly 12 digits', async () => {
    const m = await mkDc(ids.vendor, 1, '10');
    for (const bad of ['abc', '12345678901', '1234567890123', '12345678901a', '1234 5678 9012']) {
      const r = await call('POST', `/${m.dc.id}/approve`, acc, { eway_bill_no: bad });
      assert.equal(r.status, 400, bad);
      assert.match(r.body.error, /12 digits/);
    }
    assert.equal((await call('POST', `/${m.dc.id}/approve`, acc, { eway_bill_no: ' 123456789012 ' })).status, 200);
  });

  console.log('\nPhase 3 support endpoints');
  await test('GET /gst-rates returns the active rates for dropdowns', async () => {
    const r = await call('GET', '/gst-rates', store);
    assert.equal(r.status, 200);
    assert.deepEqual(r.body.gst_rates.map((g) => Number(g.rate)), [5, 18, 40]);
    assert.equal((await call('GET', '/gst-rates', pm)).status, 403);
  });
  await test('POST /tax-preview matches the real calculation and saves nothing', async () => {
    const before = (await pool.query('SELECT count(*)::int AS n FROM jobwork_returns')).rows[0].n;
    const intra = await call('POST', '/tax-preview', store, { vendor_id: ids.vendor, job_charge: '1000', gst_rate_id: ids.rate18 });
    assert.deepEqual([intra.body.split, intra.body.cgst_amount, intra.body.sgst_amount, intra.body.igst_amount, intra.body.total], ['CGST_SGST', '90.00', '90.00', '0.00', '1180.00']);
    const inter = await call('POST', '/tax-preview', acc, { vendor_id: ids.vendorD, job_charge: '1000', gst_rate_id: ids.rate5 });
    assert.deepEqual([inter.body.split, inter.body.igst_amount, inter.body.total], ['IGST', '50.00', '1050.00']);
    const none = await call('POST', '/tax-preview', store, { vendor_id: ids.vendor, job_charge: '0' });
    assert.equal(none.body.split, 'NONE');
    assert.equal((await call('POST', '/tax-preview', store, { vendor_id: ids.vendor, job_charge: '100' })).status, 400); // needs a rate
    assert.equal((await call('POST', '/tax-preview', store, { vendor_id: 999999999, job_charge: '100', gst_rate_id: ids.rate18 })).status, 404);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM jobwork_returns')).rows[0].n, before);
  });
  await test('UI check: every field the screens render is non-null, and the shared formatter gives the expected line', async () => {
    const { gstSplitText } = await import(require('node:url').pathToFileURL(require('node:path').join(__dirname, '../../src/utils/gstSplit.js')).href);
    const FIELDS = ['job_charge', 'gst_rate', 'cgst_amount', 'sgst_amount', 'igst_amount', 'total'];
    const nonNull = (row, where) => FIELDS.forEach((f) => assert.ok(row[f] !== null && row[f] !== undefined, `${where}: ${f} is ${row[f]}`));
    const intraText = 'Taxable ₹15,000 | CGST 9% ₹1,350 | SGST 9% ₹1,350 | Total ₹17,700';
    const interText = 'Taxable ₹15,000 | IGST 18% ₹2,700 | Total ₹17,700';

    // live preview (what Record return / Record vendor invoice show)
    const pIntra = await call('POST', '/tax-preview', store, { vendor_id: ids.vendor, job_charge: '15000', gst_rate_id: ids.rate18 });
    const pInter = await call('POST', '/tax-preview', store, { vendor_id: ids.vendorD, job_charge: '15000', gst_rate_id: ids.rate18 });
    nonNull(pIntra.body, 'preview intra'); nonNull(pInter.body, 'preview inter');
    assert.equal(gstSplitText(pIntra.body), intraText);
    assert.equal(gstSplitText(pInter.body), interText);

    // saved rows: invoice at the home-state vendor, return at the interstate vendor
    const a = await mkDispatched(ids.vendor, 2, '10');
    const inv = await call('POST', `/${a.dc.id}/vendor-invoices`, store, { vendor_id: ids.vendor, invoice_no: 'UI-1', job_charge: '15000', gst_rate_id: ids.rate18 });
    assert.equal(inv.status, 201, JSON.stringify(inv.body));
    const b = await mkDispatched(ids.vendorD, 2, '10');
    const rt = await ret(b.dc.id, ids.vendorD, b.dcItemId, '2', { invoice_no: 'UI-2', job_charge: '15000', gst_rate_id: ids.rate18 });
    assert.equal(rt.status, 201, JSON.stringify(rt.body));

    // Accountant's Vendor invoices tab
    const list = (await call('GET', '/vendor-invoices', acc)).body.invoices;
    const rowIntra = list.find((r) => r.invoice_no === 'UI-1');
    const rowInter = list.find((r) => r.invoice_no === 'UI-2');
    nonNull(rowIntra, 'vendor-invoices intra'); nonNull(rowInter, 'vendor-invoices inter');
    assert.equal(gstSplitText(rowIntra), intraText);
    assert.equal(gstSplitText(rowInter), interText);

    // DC detail screen
    const detailA = (await call('GET', `/${a.dc.id}`, store)).body.dc.returns.find((r) => r.invoice_no === 'UI-1');
    const detailB = (await call('GET', `/${b.dc.id}`, acc)).body.dc.returns.find((r) => r.invoice_no === 'UI-2');
    nonNull(detailA, 'dc detail intra'); nonNull(detailB, 'dc detail inter');
    assert.equal(gstSplitText(detailA), intraText);
    assert.equal(gstSplitText(detailB), interText);

    // no job charge: nothing to split, and the screens say so instead of showing 0 + 0
    const free = await mkDispatched(ids.vendorD, 1, '10');
    const freeRet = await ret(free.dc.id, ids.vendorD, free.dcItemId, '1');
    assert.equal(gstSplitText(freeRet.body.return), 'No job charge');

    // paise are kept
    assert.equal(gstSplitText({ job_charge: '20570.00', gst_rate: '18.00', cgst_amount: '1851.30', sgst_amount: '1851.30', igst_amount: '0.00', total: '24272.60' }),
      'Taxable ₹20,570 | CGST 9% ₹1,851.30 | SGST 9% ₹1,851.30 | Total ₹24,272.60');
  });
  await test('GET /:id includes the e-way requirement with reasons (value / interstate)', async () => {
    const small = await mkDc(ids.vendor, 1, '10');
    const a = await call('GET', `/${small.dc.id}`, acc);
    assert.equal(a.body.dc.eway_requirement.required, false);
    const inter = await mkDc(ids.vendorD, 1, '10');
    const b = await call('GET', `/${inter.dc.id}`, acc);
    assert.equal(b.body.dc.eway_requirement.required, true);
    assert.match(b.body.dc.eway_requirement.reasons.join(' '), /Interstate/);
    const big = await mkDc(ids.vendor, 1, '60000');
    const c = await call('GET', `/${big.dc.id}`, acc);
    assert.match(c.body.dc.eway_requirement.reasons.join(' '), /above 50000/);
  });
  await test('GET /vendor-invoices lists returns and invoice-only rows with the GST split', async () => {
    const m = await mkDispatched(ids.vendor, 2, '10');
    await call('POST', `/${m.dc.id}/vendor-invoices`, store, { vendor_id: ids.vendor, invoice_no: 'LIST-1', job_charge: '200', gst_rate_id: ids.rate18 });
    const r = await call('GET', `/vendor-invoices?dc_id=${m.dc.id}`, acc);
    assert.equal(r.status, 200);
    assert.equal(r.body.invoices.length, 1);
    assert.deepEqual([r.body.invoices[0].entry_type, r.body.invoices[0].cgst_amount, r.body.invoices[0].sgst_amount, r.body.invoices[0].gst_label], ['invoice_only', '18.00', '18.00', 'GST 18%']);
    assert.equal((await call('GET', '/vendor-invoices', pm)).status, 403);
    assert.equal((await call('GET', '/vendor-invoices', otherAccountant)).body.invoices.length, 0);
  });
  await test('attachment: store can attach while editable; blocked after approval; accountant 403', async () => {
    const m = await mkDc(ids.vendor, 1, '10');
    const send = async (user, dcId) => {
      const form = new FormData();
      form.append('attachment', new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }), 'signed.pdf');
      const res = await fetch(`${BASE}/${dcId}/attachment`, { method: 'POST', headers: { Authorization: `Bearer ${token(user)}` }, body: form });
      return { status: res.status, body: await res.json() };
    };
    assert.equal((await send(acc, m.dc.id)).status, 403);
    const ok = await send(store, m.dc.id);
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.dc.attachment_name, 'signed.pdf');
    assert.match(ok.body.dc.attachment_path, /^\/uploads\/jobwork-dc-/);
    await approve(m.dc);
    assert.equal((await send(store, m.dc.id)).status, 400);
    require('node:fs').unlink(`${__dirname}/../${ok.body.dc.attachment_path}`, () => {});
  });

  console.log('\nFix 2: history when an item is removed from a DC');
  await test('removing an item logs "removed from DC <no>" for its project', async () => {
    const a = await mkItem(p1, store, `${tag} keep`, 1);
    const b = await mkItem(p2, store, `${tag} drop`, 1);
    const created = await call('POST', '/', store, {
      vendor_id: ids.vendor, items: [
        { job_work_item_id: a.itemId, stock_item_id: stock.id, quantity: 1, unit_value: '10' },
        { job_work_item_id: b.itemId, stock_item_id: stock.id, quantity: 1, unit_value: '10' }]
    });
    const dc = created.body.dc;
    const upd = await call('PUT', `/${dc.id}`, store, {
      items: [{ job_work_item_id: a.itemId, stock_item_id: stock.id, quantity: 1, unit_value: '10' }]
    });
    assert.equal(upd.status, 200, JSON.stringify(upd.body));
    const h = await pool.query('SELECT project_id FROM project_status_history WHERE new_status = $1', [`Job Work: removed from DC ${dc.dc_number}`]);
    assert.deepEqual(h.rows.map((r) => r.project_id), [p2.id]);
    assert.equal(await requestStatus(b.requestId), 'requested');
  });

  console.log('\nDispatch');
  await test('dispatch before approval is blocked (400)', async () => {
    const m = await mkDc(ids.vendor, 2);
    const r = await call('POST', `/${m.dc.id}/dispatch`, store, {});
    assert.equal(r.status, 400);
    assert.match(r.body.error, /approved/);
  });
  await test('accountant cannot dispatch / return / move / invoice (403)', async () => {
    assert.equal((await call('POST', '/1/dispatch', acc, {})).status, 403);
    assert.equal((await call('POST', '/1/returns', acc, {})).status, 403);
    assert.equal((await call('POST', '/1/move', acc, {})).status, 403);
    assert.equal((await call('POST', '/1/vendor-invoices', acc, {})).status, 403);
  });
  await test('move or return before dispatch is blocked (400)', async () => {
    const m = await mkDc(ids.vendor, 2);
    await approve(m.dc);
    assert.equal((await call('POST', `/${m.dc.id}/move`, store, { to_vendor_id: ids.vendorC })).status, 400);
    assert.equal((await ret(m.dc.id, ids.vendor, m.dcItemId, '1')).status, 400);
  });

  console.log('\nFull cycle (B -> back), request status follows');
  await test('dispatch -> full return -> closed, location cleared, request closed', async () => {
    const m = await mkDispatched(ids.vendor, 5, '200');
    let d = await dcRow(m.dc.id);
    assert.equal(d.status, 'dispatched');
    assert.equal(d.current_location_vendor_id, ids.vendor);
    assert.ok(d.dispatched_at);
    assert.equal(await requestStatus(m.it.requestId), 'dispatched');

    const out = await call('GET', '/reports/outside', store);
    assert.ok(out.body.dcs.some((x) => x.id === m.dc.id));

    const r = await ret(m.dc.id, ids.vendor, m.dcItemId, '5', { vendor_dc_no: 'B-77', vendor_dc_date: '2026-10-10' });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    d = await dcRow(m.dc.id);
    assert.equal(d.status, 'closed');
    assert.ok(d.closed_at);
    assert.equal(d.current_location_vendor_id, null);
    assert.equal(await requestStatus(m.it.requestId), 'closed');
    const out2 = await call('GET', '/reports/outside', store);
    assert.ok(!out2.body.dcs.some((x) => x.id === m.dc.id));
    const closedHist = await pool.query("SELECT 1 FROM project_status_history WHERE new_status = 'Job Work: closed' AND notes LIKE $1", [`%${m.dc.dc_number}%`]);
    assert.equal(closedHist.rowCount, 1);
  });
  await test('closed DC accepts no more returns or moves (400)', async () => {
    const closed = (await pool.query("SELECT d.id, di.id AS item_id FROM jobwork_dcs d JOIN jobwork_dc_items di ON di.dc_id = d.id WHERE d.company_id = $1 AND d.status = 'closed' LIMIT 1", [ids.company])).rows[0];
    assert.equal((await ret(closed.id, ids.vendor, closed.item_id, '1')).status, 400);
    assert.equal((await call('POST', `/${closed.id}/move`, store, { to_vendor_id: ids.vendorC })).status, 400);
  });

  console.log('\nMove B -> C, return from C, invoice from B');
  const cyc = await mkDispatched(ids.vendor, 8, '100');
  await test('move to C updates location and records the movement', async () => {
    assert.equal((await call('POST', `/${cyc.dc.id}/move`, store, { to_vendor_id: ids.vendor })).status, 400); // already at B
    const r = await call('POST', `/${cyc.dc.id}/move`, store, { to_vendor_id: ids.vendorC, vendor_dc_no: 'B-DC-9', note: 'second process' });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.dc.current_location_vendor_id, ids.vendorC);
    assert.equal(r.body.dc.movements.length, 1);
    assert.equal(r.body.dc.movements[0].from_vendor_id, ids.vendor);
    assert.equal(r.body.dc.movements[0].vendor_dc_no, 'B-DC-9');
  });
  await test('return from B after the move is blocked (400)', async () => {
    const r = await ret(cyc.dc.id, ids.vendor, cyc.dcItemId, '2');
    assert.equal(r.status, 400);
    assert.match(r.body.error, /with now/);
    assert.equal(Number((await pool.query('SELECT returned_quantity FROM jobwork_dc_items WHERE id = $1', [cyc.dcItemId])).rows[0].returned_quantity), 0);
  });
  await test("B's invoice after the move is recorded as invoice_only (no return items)", async () => {
    const r = await call('POST', `/${cyc.dc.id}/vendor-invoices`, store, {
      vendor_id: ids.vendor, invoice_no: 'B-INV-1', invoice_date: '2026-10-11', job_charge: '1000', sac_code: '998873', gst_rate_id: ids.rate18
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.invoice.entry_type, 'invoice_only');
    assert.equal(Number(r.body.invoice.gst_amount), 180);
    const items = await pool.query('SELECT 1 FROM jobwork_return_items WHERE return_id = $1', [r.body.invoice.id]);
    assert.equal(items.rowCount, 0);
    const d = await dcRow(cyc.dc.id);
    assert.equal(d.status, 'dispatched'); // an invoice moves no goods
  });
  await test('invoice from a vendor not on the DC path (400); duplicate invoice (409)', async () => {
    const off = await call('POST', `/${cyc.dc.id}/vendor-invoices`, store, { vendor_id: ids.vendorD, invoice_no: 'D-1' });
    assert.equal(off.status, 400);
    const dup = await call('POST', `/${cyc.dc.id}/vendor-invoices`, store, { vendor_id: ids.vendor, invoice_no: 'b-inv-1' });
    assert.equal(dup.status, 409);
  });
  await test('invoice before dispatch is blocked (400)', async () => {
    const m = await mkDc(ids.vendor, 1);
    assert.equal((await call('POST', `/${m.dc.id}/vendor-invoices`, store, { vendor_id: ids.vendor, invoice_no: 'X' })).status, 400);
  });
  await test('return from C closes the DC with C invoice (CGST/SGST: " KARNATAKA " = Karnataka)', async () => {
    const r = await ret(cyc.dc.id, ids.vendorC, cyc.dcItemId, '8', {
      invoice_no: 'C-INV-1', job_charge: '2000', sac_code: '998873', gst_rate_id: ids.rate18, vendor_dc_no: 'C-DC-1'
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.dc.status, 'closed');
    assert.equal(r.body.dc.returns.length, 2); // B's invoice + C's return
    assert.equal(Number(r.body.return.cgst_amount), 180);
    assert.equal(Number(r.body.return.sgst_amount), 180);
  });

  console.log('\nPartial -> full return; over-return');
  await test('partial return -> partially_returned; over-return blocked and rolled back; final return -> closed', async () => {
    const m = await mkDispatched(ids.vendor, 10, '100');
    let r = await ret(m.dc.id, ids.vendor, m.dcItemId, '4');
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.dc.status, 'partially_returned');
    assert.equal(await requestStatus(m.it.requestId), 'partially_returned');

    const returnsBefore = (await pool.query('SELECT count(*)::int AS n FROM jobwork_returns WHERE dc_id = $1', [m.dc.id])).rows[0].n;
    r = await ret(m.dc.id, ids.vendor, m.dcItemId, '7', { invoice_no: 'OVER-1' });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /only 6/);
    const returnsAfter = (await pool.query('SELECT count(*)::int AS n FROM jobwork_returns WHERE dc_id = $1', [m.dc.id])).rows[0].n;
    assert.equal(returnsAfter, returnsBefore); // whole transaction rolled back
    assert.equal(Number((await pool.query('SELECT returned_quantity FROM jobwork_dc_items WHERE id = $1', [m.dcItemId])).rows[0].returned_quantity), 4);

    const rep = await call('GET', '/reports/outside', acc);
    const row = rep.body.dcs.find((x) => x.id === m.dc.id);
    assert.equal(Number(row.pending_value), 600);
    assert.equal(Number(row.pending_items[0].pending), 6);

    r = await ret(m.dc.id, ids.vendor, m.dcItemId, '6');
    assert.equal(r.body.dc.status, 'closed');
    assert.equal(await requestStatus(m.it.requestId), 'closed');
  });
  await test('return validation: wrong item, zero, duplicate, empty', async () => {
    const m = await mkDispatched(ids.vendor, 3, '10');
    const other = await mkDc(ids.vendor, 1);
    assert.equal((await ret(m.dc.id, ids.vendor, other.dcItemId, '1')).status, 400);   // item of another DC
    assert.equal((await ret(m.dc.id, ids.vendor, m.dcItemId, '0')).status, 400);
    assert.equal((await call('POST', `/${m.dc.id}/returns`, store, { vendor_id: ids.vendor, items: [] })).status, 400);
    assert.equal((await call('POST', `/${m.dc.id}/returns`, store, { vendor_id: ids.vendor, items: [
      { dc_item_id: m.dcItemId, quantity_received: 1 }, { dc_item_id: m.dcItemId, quantity_received: 1 }] })).status, 400);
  });
  await test('return from a vendor that is not the current location is blocked (400)', async () => {
    const m = await mkDispatched(ids.vendor, 3, '10');
    const r = await ret(m.dc.id, ids.vendorC, m.dcItemId, '1');
    assert.equal(r.status, 400);
    assert.match(r.body.error, /with now/);
  });

  console.log('\nGST split');
  await test('same state -> CGST + SGST, half each, IGST 0', async () => {
    const m = await mkDispatched(ids.vendor, 1, '10');
    const r = await ret(m.dc.id, ids.vendor, m.dcItemId, '1', { invoice_no: 'S-1', job_charge: '1000', gst_rate_id: ids.rate18 });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const x = r.body.return;
    assert.deepEqual([x.gst_amount, x.cgst_amount, x.sgst_amount, x.igst_amount, x.total], ['180.00', '90.00', '90.00', '0.00', '1180.00']);
  });
  await test('odd paisa: CGST + SGST always add up to the GST amount', async () => {
    const m = await mkDispatched(ids.vendor, 1, '10');
    const r = await ret(m.dc.id, ids.vendor, m.dcItemId, '1', { invoice_no: 'S-2', job_charge: '10.05', gst_rate_id: ids.rate18 });
    const x = r.body.return;
    assert.equal(x.gst_amount, '1.81');
    assert.equal(Math.round(Number(x.cgst_amount) * 100) + Math.round(Number(x.sgst_amount) * 100), 181);
    assert.equal(x.igst_amount, '0.00');
  });
  await test('different state -> IGST only', async () => {
    const m = await mkDispatched(ids.vendorD, 1, '10');
    const r = await ret(m.dc.id, ids.vendorD, m.dcItemId, '1', { invoice_no: 'S-3', job_charge: '1000', gst_rate_id: ids.rate5 });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const x = r.body.return;
    assert.deepEqual([x.gst_amount, x.cgst_amount, x.sgst_amount, x.igst_amount, x.total], ['50.00', '0.00', '0.00', '50.00', '1050.00']);
  });
  await test('GST is on the job charge only, never on component value', async () => {
    const m = await mkDispatched(ids.vendor, 1, '999999');
    const r = await ret(m.dc.id, ids.vendor, m.dcItemId, '1', { invoice_no: 'S-4', job_charge: '100', gst_rate_id: ids.rate18 });
    assert.equal(r.body.return.gst_amount, '18.00');
  });
  await test('vendor state unknown + job charge -> 400 (cannot decide the split)', async () => {
    const m = await mkDispatched(ids.vendorE, 1, '10');
    const r = await ret(m.dc.id, ids.vendorE, m.dcItemId, '1', { invoice_no: 'S-5', job_charge: '100', gst_rate_id: ids.rate18 });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /state/i);
  });
  await test('job charge needs invoice_no and a GST rate; no charge needs neither', async () => {
    const m = await mkDispatched(ids.vendor, 3, '10');
    assert.equal((await ret(m.dc.id, ids.vendor, m.dcItemId, '1', { job_charge: '100', gst_rate_id: ids.rate18 })).status, 400);
    assert.equal((await ret(m.dc.id, ids.vendor, m.dcItemId, '1', { invoice_no: 'S-6', job_charge: '100' })).status, 400);
    const free = await ret(m.dc.id, ids.vendor, m.dcItemId, '1');
    assert.equal(free.status, 201);
    assert.equal(free.body.return.total, '0.00');
  });
  await test('duplicate invoice number from the same vendor on a return (409)', async () => {
    const m = await mkDispatched(ids.vendor, 2, '10');
    const first = await ret(m.dc.id, ids.vendor, m.dcItemId, '1', { invoice_no: 'DUP-1' });
    assert.equal(first.status, 201);
    assert.equal((await ret(m.dc.id, ids.vendor, m.dcItemId, '1', { invoice_no: 'dup-1' })).status, 409);
  });

  console.log('\nProject view, report, company state');
  await test('PM of the project sees its job work, read-only', async () => {
    const r = await call('GET', `/project/${p1.id}`, pm);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const items = r.body.requests.flatMap((q) => q.items);
    assert.ok(items.some((i) => i.where.startsWith('At ')));
    assert.ok(items.some((i) => i.where === 'Returned to factory'));
    assert.ok(items.every((i) => i.total_value === undefined && i.job_charge === undefined));
    assert.equal((await call('POST', `/project/${p1.id}`, pm, {})).status, 404); // no write route exists
  });
  await test('PM of another project -> 403; store/accountant -> 403', async () => {
    assert.equal((await call('GET', `/project/${p1.id}`, pm2)).status, 403);
    assert.equal((await call('GET', `/project/${p1.id}`, store)).status, 403);
    assert.equal((await call('GET', `/project/${p1.id}`, acc)).status, 403);
  });
  await test('management can read any project; another company gets 404', async () => {
    assert.equal((await call('GET', `/project/${p2.id}`, management)).status, 200);
    const otherMgmt = await mkUser('management', ids.otherCompany);
    ids.users.otherMgmt = otherMgmt;
    assert.equal((await call('GET', `/project/${p1.id}`, otherMgmt)).status, 404);
  });
  await test('outside report: filters by current-location vendor and project', async () => {
    const m = await mkDispatched(ids.vendor, 2, '50', p2);
    await call('POST', `/${m.dc.id}/move`, store, { to_vendor_id: ids.vendorC });
    const byC = await call('GET', `/reports/outside?vendor_id=${ids.vendorC}`, store);
    assert.ok(byC.body.dcs.some((d) => d.id === m.dc.id));
    assert.ok(byC.body.dcs.every((d) => d.current_location_vendor_id === ids.vendorC));
    const byB = await call('GET', `/reports/outside?vendor_id=${ids.vendor}`, store);
    assert.ok(!byB.body.dcs.some((d) => d.id === m.dc.id));
    const byProject = await call('GET', `/reports/outside?project_id=${p2.id}`, acc);
    assert.ok(byProject.body.dcs.some((d) => d.id === m.dc.id));
    assert.ok(Number(byProject.body.summary.pending_value) >= 100);
    assert.equal((await call('GET', '/reports/outside?from=2999-01-01', acc)).body.dcs.length, 0);
    assert.equal((await call('GET', '/reports/outside', pm)).status, 403);
  });
  await test('company state: management sets it, store cannot', async () => {
    assert.equal((await call('PUT', '/company-state', store, { state: 'Kerala' })).status, 403);
    assert.equal((await call('PUT', '/company-state', management, { state: 'Karnataka' })).status, 200);
    assert.equal((await call('GET', '/company-state', store)).body.state, 'Karnataka');
  });

  // ================================================================== Phase 4
  console.log('\nStock item requests');
  const notifFor = async (userId, type) =>
    (await pool.query('SELECT * FROM notifications WHERE user_id = $1 AND type = $2 ORDER BY id DESC', [userId, type])).rows;
  const reqItemA = await mkItem(p1, store, `${tag} Flange 200mm`, 4);
  const reqItemSame = await mkItem(p2, store, `${tag} Flange 200mm`, 6); // same name, other project, still no stock item
  let reqA;

  await test('Store requests a stock item: context is captured automatically, accountant notified with request_id in data', async () => {
    const r = await call('POST', '/stock-item-requests', store, {
      name: `${tag} Flange 200mm`, hsn: '7307', unit: 'pcs', job_work_item_id: reqItemA.itemId, drawing_no: 'DRG-42',
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    reqA = r.body.request;
    assert.equal(reqA.status, 'pending');
    assert.equal(reqA.requested_by, store.id);
    assert.equal(reqA.requester_role, 'store_incharge');
    assert.equal(reqA.job_work_item_id, reqItemA.itemId);
    assert.equal(reqA.project_id, p1.id);
    const c = reqA.context;
    assert.equal(c.project_name, `${tag} Project 1`);
    assert.equal(c.customer_po_no, `PO-${tag}-1`);
    assert.equal(c.item_description, `${tag} Flange 200mm`);
    assert.equal(c.process, 'Shot Blasting');
    assert.equal(c.drawing_no, 'DRG-42');
    assert.equal(Number(c.weights.actual), 50);
    assert.ok(c.requester_name && c.requested_at);
    const n = (await notifFor(acc.id, 'jobwork_stock_item_request')).find((x) => x.data && x.data.request_id === reqA.id);
    assert.ok(n, 'notification with data.request_id');
    assert.equal(n.data.job_work_item_id, reqItemA.itemId);
  });
  await test('duplicate pending request for the same name is blocked (409), case-insensitive, even from another role', async () => {
    const again = await call('POST', '/stock-item-requests', store, { name: `${tag} Flange 200mm` });
    assert.equal(again.status, 409);
    assert.match(again.body.error, /already been requested/);
    const caseDup = await call('POST', '/stock-item-requests', store, { name: `${tag} FLANGE 200MM`.toLowerCase(), job_work_item_id: reqItemSame.itemId });
    assert.equal(caseDup.status, 409);
    const count = await pool.query("SELECT count(*)::int AS n FROM stock_item_requests WHERE company_id = $1 AND LOWER(requested_name) = LOWER($2) AND status = 'pending'", [ids.company, `${tag} Flange 200mm`]);
    assert.equal(count.rows[0].n, 1);
  });
  await test('a name that already exists as a stock item cannot be requested (409)', async () => {
    const r = await call('POST', '/stock-item-requests', store, { name: stockPlate.name.toUpperCase() });
    assert.equal(r.status, 409);
    assert.match(r.body.error, /already exists/);
  });
  await test('Store and PM can request; accountant and management cannot (403); name required (400)', async () => {
    const pmAsk = await call('POST', '/stock-item-requests', pm, { name: tag + ' PM Ask', project_id: p1.id });
    assert.equal(pmAsk.status, 201, JSON.stringify(pmAsk.body));
    assert.equal(pmAsk.body.request.requester_role, 'project_manager');
    assert.equal(pmAsk.body.request.source, 'stock');
    assert.ok((await call('GET', '/stock-item-requests', pm)).body.requests.some((x) => x.id === pmAsk.body.request.id)); // PM sees their own
    assert.equal((await call('POST', '/stock-item-requests', acc, { name: 'x' })).status, 403);
    assert.equal((await call('POST', '/stock-item-requests', management, { name: 'x' })).status, 403);
    assert.equal((await call('POST', '/stock-item-requests', store, { name: '  ' })).status, 400);
    assert.equal((await call('POST', '/stock-item-requests', store, { name: tag + ' Ghost', job_work_item_id: 999999999 })).status, 404);
  });
  let reqPm;
  await test('a request with only a project (no item): context comes from the project and the given description', async () => {
    const r = await call('POST', '/stock-item-requests', store, { name: `${tag} Gusset Plate`, project_id: p1.id, process: 'Laser Cutting', item_description: 'Gusset plate 8mm' });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    reqPm = r.body.request;
    assert.equal(reqPm.requester_role, 'store_incharge');
    assert.equal(reqPm.job_work_item_id, null);
    assert.equal(reqPm.context.project_name, `${tag} Project 1`);
    assert.equal(reqPm.context.process, 'Laser Cutting');
    assert.equal(reqPm.context.item_description, 'Gusset plate 8mm');
  });
  await test('list scoping and pending count; accountant sees all, requester sees own', async () => {
    const accList = await call('GET', '/stock-item-requests?status=pending', acc);
    assert.ok(accList.body.requests.some((x) => x.id === reqA.id) && accList.body.requests.some((x) => x.id === reqPm.id));
    const storeList = await call('GET', '/stock-item-requests', store);
    assert.ok(storeList.body.requests.some((x) => x.id === reqA.id) && storeList.body.requests.some((x) => x.id === reqPm.id));
    assert.equal((await call('GET', '/stock-item-requests', otherStore)).body.requests.length, 0); // another company's store sees nothing
    assert.equal((await call('GET', '/stock-item-requests', otherAccountant)).body.requests.length, 0);
    const cnt = await call('GET', '/stock-item-requests/pending-count', acc);
    assert.ok(cnt.body.count >= 2);
    assert.equal((await call('GET', '/stock-item-requests/pending-count', store)).status, 403);
    assert.equal((await call('GET', '/stock-item-requests?status=bogus', acc)).status, 400);
  });
  await test('request detail: accountant sees context and similar existing items; a non-owner PM gets 403', async () => {
    const similar = (await call('POST', '/stock-items', acc, { name: `${tag} Flange 250mm`, hsn: '7307', unit: 'pcs' })).body.stock_item;
    const d = await call('GET', `/stock-item-requests/${reqA.id}`, acc);
    assert.equal(d.status, 200);
    assert.ok(d.body.similar_items.some((x) => x.id === similar.id), 'similar name found');
    assert.equal(d.body.request.context.project_name, `${tag} Project 1`);
    assert.equal((await call('GET', `/stock-item-requests/${reqA.id}`, pm2)).status, 403);
    assert.equal((await call('GET', `/stock-item-requests/${reqA.id}`, store)).status, 200);
    assert.equal((await call('GET', `/stock-item-requests/${reqA.id}`, otherAccountant)).status, 404);
  });
  await test('only the accountant can resolve (403 for store / PM / management)', async () => {
    for (const u of [store, pm, management]) {
      assert.equal((await call('POST', `/stock-item-requests/${reqA.id}/reject`, u, { reason: 'x' })).status, 403);
      assert.equal((await call('POST', `/stock-item-requests/${reqA.id}/link`, u, { stock_item_id: 1 })).status, 403);
    }
  });
  await test('LINK to an existing item: status linked, stock item auto-filled on the item and on the same-named item, requester notified', async () => {
    const existing = (await call('GET', `/stock-items?search=${encodeURIComponent(`${tag} Flange 250mm`)}`, acc)).body.stock_items[0];
    const r = await call('POST', `/stock-item-requests/${reqA.id}/link`, acc, { stock_item_id: existing.id });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.request.status, 'linked');
    assert.equal(r.body.request.stock_item_id, existing.id);
    assert.equal(r.body.request.resolved_by, acc.id);
    assert.equal(r.body.autofilled_items, 2);
    const rows = await pool.query('SELECT id, stock_item_id FROM job_work_items WHERE id = ANY($1) ORDER BY id', [[reqItemA.itemId, reqItemSame.itemId]]);
    assert.ok(rows.rows.every((x) => x.stock_item_id === existing.id));
    const n = (await notifFor(store.id, 'jobwork_stock_item_resolved'))[0];
    assert.equal(n.data.request_id, reqA.id);
    assert.equal(n.data.status, 'linked');
    assert.equal(n.data.stock_item_id, existing.id);
  });
  await test('a resolved request cannot be resolved again (400)', async () => {
    assert.equal((await call('POST', `/stock-item-requests/${reqA.id}/reject`, acc, { reason: 'late' })).status, 400);
    assert.equal((await call('POST', `/stock-item-requests/${reqA.id}/link`, acc, { stock_item_id: 1 })).status, 400);
  });
  await test('CREATE new: status created, new stock item, auto-filled; a taken name is a 409 and leaves the request pending', async () => {
    const r1 = await call('POST', `/stock-item-requests/${reqPm.id}/create`, acc, { name: stockPlate.name, unit: 'pcs' });
    assert.equal(r1.status, 409);
    assert.equal((await pool.query('SELECT status FROM stock_item_requests WHERE id = $1', [reqPm.id])).rows[0].status, 'pending');
    assert.equal((await call('POST', `/stock-item-requests/${reqPm.id}/create`, acc, { name: `${tag} Gusset Plate` })).status, 400); // unit missing
    const r2 = await call('POST', `/stock-item-requests/${reqPm.id}/create`, acc, { name: `${tag} Gusset Plate`, hsn: '7308', unit: 'pcs' });
    assert.equal(r2.status, 201, JSON.stringify(r2.body));
    assert.equal(r2.body.request.status, 'created');
    assert.equal(r2.body.request.stock_item_name, `${tag} Gusset Plate`);
    const n = (await notifFor(store.id, 'jobwork_stock_item_resolved')).find((x) => x.data.request_id === reqPm.id);
    assert.ok(n, 'requester notified');
    assert.equal(n.data.status, 'created');
  });
  await test('REJECT needs a reason; requester sees it; the name can be requested again afterwards', async () => {
    const q = (await call('POST', '/stock-item-requests', store, { name: `${tag} Odd Bracket`, unit: 'pcs' })).body.request;
    assert.equal((await call('POST', `/stock-item-requests/${q.id}/reject`, acc, {})).status, 400);
    const r = await call('POST', `/stock-item-requests/${q.id}/reject`, acc, { reason: 'Use the Bracket item instead' });
    assert.equal(r.status, 200);
    assert.equal(r.body.request.status, 'rejected');
    assert.equal(r.body.request.reason, 'Use the Bracket item instead');
    const n = (await notifFor(store.id, 'jobwork_stock_item_resolved'))[0];
    assert.equal(n.data.status, 'rejected');
    assert.match(n.message, /Use the Bracket/);
    assert.equal((await call('POST', '/stock-item-requests', store, { name: `${tag} Odd Bracket`, unit: 'pcs' })).status, 201);
  });
  await test('legacy alias POST /stock-items/request still creates a real request', async () => {
    const r = await call('POST', '/stock-items/request', store, { name: `${tag} Alias Item`, unit: 'kg' });
    assert.equal(r.status, 201);
    assert.equal(r.body.request.status, 'pending');
  });

  console.log('\nPM job work submit');
  const submit = async (user, items, extra = {}) => {
    const form = new FormData();
    const fields = {
      project_id: p1.id, job_work_type: 'Shot Blasting', store_incharge_id: store.id, items: JSON.stringify(items), ...extra,
    };
    Object.entries(fields).forEach(([k, v]) => form.append(k, String(v)));
    const res = await fetch(`http://localhost:${TEST_PORT}/api/projects/job-work/submit`, { method: 'POST', headers: { Authorization: `Bearer ${token(user)}` }, body: form });
    const body = await res.json();
    if (body.jobWorkId) ids.requests.push(body.jobWorkId);
    return { status: res.status, body };
  };
  await test('the PM sends no vehicle weights or vehicle number: submit works and stores NULL (Store records weights on the DC)', async () => {
    const r = await submit(pm, [{ material_name: tag + ' No Weights', quantity: 2, unit: 'pcs' }]);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const row = (await pool.query('SELECT loaded_vehicle_weight, unloaded_vehicle_weight, actual_vehicle_weight, vehicle_no FROM job_work_requests WHERE id = $1', [r.body.jobWorkId])).rows[0];
    assert.deepEqual(row, { loaded_vehicle_weight: null, unloaded_vehicle_weight: null, actual_vehicle_weight: null, vehicle_no: null });
    // it still reaches Store like any other request, and the stock request context just has no weights
    const x = (await pool.query('SELECT id FROM job_work_items WHERE job_work_id = $1', [r.body.jobWorkId])).rows[0].id;
    const pending = (await call('GET', '/pending-items', store)).body.projects.flatMap((g) => g.items).find((i) => i.job_work_item_id === x);
    assert.ok(pending, 'shows up in Store pending items');
    const req = await call('POST', '/stock-item-requests', store, { name: tag + ' No Weights', job_work_item_id: x });
    assert.equal(req.status, 201, JSON.stringify(req.body));
    assert.equal(req.body.request.context.weights.actual, null);
  });
  await test('old clients that still send weights and a vehicle number keep working', async () => {
    const r = await submit(pm, [{ material_name: tag + ' With Weights', quantity: 1, unit: 'pcs' }],
      { loaded_vehicle_weight: 100, unloaded_vehicle_weight: 40, actual_vehicle_weight: 60, vehicle_no: 'KA01AB1234' });
    assert.equal(r.status, 200);
    const row = (await pool.query('SELECT loaded_vehicle_weight, actual_vehicle_weight, vehicle_no FROM job_work_requests WHERE id = $1', [r.body.jobWorkId])).rows[0];
    assert.deepEqual([Number(row.loaded_vehicle_weight), Number(row.actual_vehicle_weight), row.vehicle_no], [100, 60, 'KA01AB1234']);
  });
  await test('project, job work type and Store are still required (400)', async () => {
    assert.equal((await submit(pm, [{ material_name: 'x', quantity: 1, unit: 'pcs' }], { store_incharge_id: '' })).status, 400);
    assert.equal((await submit(pm, [{ material_name: 'x', quantity: 1, unit: 'pcs' }], { job_work_type: '' })).status, 400);
  });
  const itemRow = async (jobWorkId, name) =>
    (await pool.query('SELECT id, stock_item_id, item_kind FROM job_work_items WHERE job_work_id = $1 AND material_name = $2', [jobWorkId, name])).rows[0];

  await test('EARLIER FLOW: submit with a stock item picked stores it on the item; an unknown stock item is a 400', async () => {
    const ok = await submit(pm, [{ material_name: tag + ' Picked', quantity: 2, unit: 'pcs', stock_item_id: stockPlate.id }]);
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    const row = await itemRow(ok.body.jobWorkId, tag + ' Picked');
    assert.equal(row.stock_item_id, stockPlate.id);
    assert.equal(row.item_kind, 'stock');
    assert.equal((await submit(pm, [{ material_name: tag + ' Nope', quantity: 1, unit: 'pcs', stock_item_id: 999999999 }])).status, 400);
  });
  await test('EARLIER FLOW: a request made from the form is attached to the new item, and filled in once resolved (or at once if already resolved)', async () => {
    const pending = (await call('POST', '/stock-item-requests', pm, { name: tag + ' Pending From Form', project_id: p1.id })).body.request;
    const a1 = await submit(pm, [{ material_name: tag + ' Pending From Form', quantity: 1, unit: 'pcs', stock_item_request_id: pending.id }]);
    assert.equal(a1.status, 200, JSON.stringify(a1.body));
    const itemA = await itemRow(a1.body.jobWorkId, tag + ' Pending From Form');
    assert.equal(itemA.stock_item_id, null);
    assert.equal((await pool.query('SELECT job_work_item_id FROM stock_item_requests WHERE id = $1', [pending.id])).rows[0].job_work_item_id, itemA.id);
    const done = await call('POST', '/stock-item-requests/' + pending.id + '/create', acc, { unit: 'pcs' });
    assert.equal(done.status, 201, JSON.stringify(done.body));
    assert.equal((await itemRow(a1.body.jobWorkId, tag + ' Pending From Form')).stock_item_id, done.body.request.stock_item_id);
    const early = (await call('POST', '/stock-item-requests', pm, { name: tag + ' Resolved Early', project_id: p1.id })).body.request;
    const created = await call('POST', '/stock-item-requests/' + early.id + '/create', acc, { unit: 'pcs' });
    const b1 = await submit(pm, [{ material_name: tag + ' Resolved Early', quantity: 1, unit: 'pcs', stock_item_request_id: early.id }]);
    assert.equal((await itemRow(b1.body.jobWorkId, tag + ' Resolved Early')).stock_item_id, created.body.request.stock_item_id);
  });

  console.log('\nProduct being developed -> accountant list');
  let productReq;
  await test('PRODUCT: the product being developed is saved as kind product and listed for the accountant to add to stock', async () => {
    const r = await submit(pm, [{ material_name: tag + ' Gearbox Housing', hsn: '8483', item_code: ' DRG-7781-A ', quantity: 1, unit: 'nos', item_kind: 'product' }]);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const item = await itemRow(r.body.jobWorkId, tag + ' Gearbox Housing');
    assert.equal(item.item_kind, 'product');
    assert.equal(item.stock_item_id, null);
    const stored = (await pool.query('SELECT hsn, item_code FROM job_work_items WHERE id = $1', [item.id])).rows[0];
    assert.deepEqual(stored, { hsn: null, item_code: 'DRG-7781-A' });
    const list = (await call('GET', '/stock-item-requests?source=product&status=pending', acc)).body.requests;
    productReq = list.find((x) => x.requested_name === tag + ' Gearbox Housing');
    assert.ok(productReq, 'listed for the accountant');
    assert.equal(productReq.source, 'product');
    assert.equal(productReq.job_work_item_id, item.id);
    assert.equal(productReq.requested_by, pm.id);
    assert.equal(productReq.requested_hsn, null); // a product has no HSN; the accountant sets it on the stock item
    assert.equal(productReq.context.drawing_no, 'DRG-7781-A');
    assert.equal(productReq.context.project_name, tag + ' Project 1');
    assert.equal(productReq.context.item_description, tag + ' Gearbox Housing');
    assert.equal(productReq.context.process, 'Shot Blasting');
    const n = (await notifFor(acc.id, 'jobwork_stock_item_request')).find((x) => x.data && x.data.request_id === productReq.id);
    assert.ok(n, 'accountant notified');
    assert.equal(n.data.source, 'product');
  });
  await test('PRODUCT: the accountant\'s source dropdown filters: stock requests vs products vs all', async () => {
    const products = (await call('GET', '/stock-item-requests?source=product', acc)).body.requests;
    const stocks = (await call('GET', '/stock-item-requests?source=stock', acc)).body.requests;
    const all = (await call('GET', '/stock-item-requests', acc)).body.requests;
    assert.ok(products.length >= 1 && products.every((x) => x.source === 'product'));
    assert.ok(stocks.length >= 1 && stocks.every((x) => x.source === 'stock'));
    assert.ok(!stocks.some((x) => x.id === productReq.id) && all.some((x) => x.id === productReq.id));
    assert.equal((await call('GET', '/stock-item-requests?source=bogus', acc)).status, 400);
  });
  await test('PRODUCT: a second job work for the same product adds no duplicate; both items are filled in when the accountant adds it to stock', async () => {
    const again = await submit(pm, [{ material_name: tag + ' Gearbox Housing', quantity: 2, unit: 'nos', item_kind: 'product' }]);
    assert.equal(again.status, 200);
    const pendingCount = (await pool.query("SELECT count(*)::int AS n FROM stock_item_requests WHERE company_id = $1 AND LOWER(requested_name) = LOWER($2) AND status = 'pending'", [ids.company, tag + ' Gearbox Housing'])).rows[0].n;
    assert.equal(pendingCount, 1);
    const created = await call('POST', '/stock-item-requests/' + productReq.id + '/create', acc, { name: tag + ' Gearbox Housing', hsn: '8483', unit: 'nos' });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.autofilled_items, 2);
    assert.equal((await itemRow(again.body.jobWorkId, tag + ' Gearbox Housing')).stock_item_id, created.body.request.stock_item_id);
    const n = (await notifFor(pm.id, 'jobwork_stock_item_resolved')).find((x) => x.data.request_id === productReq.id);
    assert.ok(n, 'the PM is told it was added to stock');
  });
  await test('PRODUCT: with no drawing / part number a reference is generated (job id + position); stock items keep their HSN and get no code', async () => {
    const r = await submit(pm, [
      { material_name: tag + ' Auto Ref A', quantity: 1, unit: 'nos', item_kind: 'product' },
      { material_name: tag + ' Auto Ref B', quantity: 1, unit: 'nos', item_kind: 'product', item_code: '   ' },
      { material_name: tag + ' Plain Stock', hsn: '7308', item_code: 'IGNORED', quantity: 1, unit: 'pcs' }]);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const jobId = (await pool.query('SELECT job_id FROM job_work_requests WHERE id = $1', [r.body.jobWorkId])).rows[0].job_id;
    const code = async (name) => (await pool.query('SELECT hsn, item_code FROM job_work_items WHERE job_work_id = $1 AND material_name = $2', [r.body.jobWorkId, tag + ' ' + name])).rows[0];
    assert.deepEqual(await code('Auto Ref A'), { hsn: null, item_code: jobId + '-1' });
    assert.deepEqual(await code('Auto Ref B'), { hsn: null, item_code: jobId + '-2' });
    assert.deepEqual(await code('Plain Stock'), { hsn: '7308', item_code: null });
  });
  await test('PRODUCT: Store and the accountant see the part / drawing number; no HSN warning for a product', async () => {
    const r = await submit(pm, [{ material_name: tag + ' Coded Product', item_code: 'PN-4410', quantity: 1, unit: 'nos', item_kind: 'product' }]);
    const x = (await pool.query('SELECT id FROM job_work_items WHERE job_work_id = $1', [r.body.jobWorkId])).rows[0].id;
    const pending = (await call('GET', '/pending-items', store)).body.projects.flatMap((g) => g.items).find((i) => i.job_work_item_id === x);
    assert.equal(pending.item_code, 'PN-4410');
    assert.equal(pending.hsn, null);
    const dc = await call('POST', '/', store, { vendor_id: ids.vendor, items: [{ job_work_item_id: x, stock_item_id: stockPlate.id, quantity: 1, unit_value: '5' }] });
    assert.equal(dc.body.dc.items[0].pm_item_code, 'PN-4410');
    const { hsnMismatch } = await import(require('node:url').pathToFileURL(require('node:path').join(__dirname, '../../src/utils/hsn.js')).href);
    assert.equal(hsnMismatch(dc.body.dc.items[0].pm_hsn, '7208'), false); // nothing to compare, so no warning
  });
  await test('PRODUCT: no list entry when the product already exists as a stock item, or when a stock item was chosen; bad kind is a 400', async () => {
    const before = (await pool.query('SELECT count(*)::int AS n FROM stock_item_requests WHERE company_id = $1', [ids.company])).rows[0].n;
    const same = await submit(pm, [{ material_name: tag + ' Gearbox Housing', quantity: 1, unit: 'nos', item_kind: 'product' }]); // now a stock item
    const chosen = await submit(pm, [{ material_name: tag + ' Chosen Product', quantity: 1, unit: 'nos', item_kind: 'product', stock_item_id: stockPlate.id }]);
    assert.equal(same.status, 200);
    assert.equal(chosen.status, 200);
    const after = (await pool.query('SELECT count(*)::int AS n FROM stock_item_requests WHERE company_id = $1', [ids.company])).rows[0].n;
    assert.equal(after, before);
    assert.equal((await submit(pm, [{ material_name: 'x', quantity: 1, unit: 'pcs', item_kind: 'nonsense' }])).status, 400);
  });
  await test('PRODUCT: Store sees the kind on pending items and on the DC', async () => {
    const r = await submit(pm, [{ material_name: tag + ' Kind Check', quantity: 1, unit: 'pcs', item_kind: 'product', stock_item_id: stockPlate.id }]);
    const x = (await itemRow(r.body.jobWorkId, tag + ' Kind Check')).id;
    const row = (await call('GET', '/pending-items', store)).body.projects.flatMap((g) => g.items).find((i) => i.job_work_item_id === x);
    assert.equal(row.item_kind, 'product');
    const dc = await call('POST', '/', store, { vendor_id: ids.vendor, items: [{ job_work_item_id: x, stock_item_id: stockPlate.id, quantity: 1, unit_value: '5' }] });
    assert.equal(dc.body.dc.items[0].item_kind, 'product');
  });

  console.log('\nBOM link, stock item pre-fill, HSN warning');
  const bomLink = async (jobWorkId, name) =>
    (await pool.query('SELECT bom_item_id, revision_bom_item_id FROM job_work_items WHERE job_work_id = $1 AND material_name = $2', [jobWorkId, name])).rows[0];
  const itemIdOf = async (jobWorkId, name) =>
    (await pool.query('SELECT id FROM job_work_items WHERE job_work_id = $1 AND material_name = $2', [jobWorkId, name])).rows[0].id;
  const pendingRow = async (itemId) =>
    (await call('GET', '/pending-items', store)).body.projects.flatMap((g) => g.items).find((i) => i.job_work_item_id === itemId);
  const planOnDc = async (itemId, stockItem, qtyValue) =>
    call('POST', '/', store, { vendor_id: ids.vendor, items: [{ job_work_item_id: itemId, stock_item_id: stockItem.id, quantity: qtyValue, unit_value: '10' }] });
  const mkStock = async (name, hsn) => (await call('POST', '/stock-items', acc, { name: tag + ' ' + name, hsn, unit: 'pcs' })).body.stock_item;
  const rodItem = (extra = {}) => ({ material_name: tag + ' Support Rod', hsn: '7308', quantity: 4, unit: 'pcs', bom_source: 'bom', bom_item_id: ids.bomRow, ...extra });

  await test('submit from the BOM saves the link (project BOM or revision BOM); free text saves none', async () => {
    const r = await submit(pm, [
      rodItem(),
      { material_name: tag + ' Rev Bracket', quantity: 2, unit: 'pcs', bom_source: 'revision', bom_item_id: ids.revRow },
      { material_name: tag + ' Free Thing', quantity: 1, unit: 'pcs' },
    ]);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.deepEqual(await bomLink(r.body.jobWorkId, tag + ' Support Rod'), { bom_item_id: ids.bomRow, revision_bom_item_id: null });
    assert.deepEqual(await bomLink(r.body.jobWorkId, tag + ' Rev Bracket'), { bom_item_id: null, revision_bom_item_id: ids.revRow });
    assert.deepEqual(await bomLink(r.body.jobWorkId, tag + ' Free Thing'), { bom_item_id: null, revision_bom_item_id: null });
  });
  await test('a BOM link must belong to the project; bad links are 400 and nothing is saved', async () => {
    const before = (await pool.query('SELECT count(*)::int AS n FROM job_work_requests WHERE company_id = $1', [ids.company])).rows[0].n;
    const other = await submit(pm, [{ material_name: 'x', quantity: 1, unit: 'pcs', bom_source: 'bom', bom_item_id: ids.bomRowP2 }]); // a row of project 2, sent for project 1
    assert.equal(other.status, 400);
    assert.match(other.body.error, /not in this project/);
    assert.equal((await submit(pm, [{ material_name: 'x', quantity: 1, unit: 'pcs', bom_source: 'revision', bom_item_id: ids.bomRow }])).status, 400); // a project-BOM id used as a revision row
    assert.equal((await submit(pm, [{ material_name: 'x', quantity: 1, unit: 'pcs', bom_source: 'nonsense', bom_item_id: ids.bomRow }])).status, 400);
    assert.equal((await submit(pm, [{ material_name: 'x', quantity: 1, unit: 'pcs', bom_source: 'bom', bom_item_id: 999999999 }])).status, 400);
    const after = (await pool.query('SELECT count(*)::int AS n FROM job_work_requests WHERE company_id = $1', [ids.company])).rows[0].n;
    assert.equal(after, before);
  });
  await test('PRE-FILL: Store maps a stock item once; the next job work for the same BOM item is suggested it; latest mapping wins', async () => {
    const s1 = await mkStock('Rod Stock A', '7308');
    const s3 = await mkStock('Rod Stock B', '7308');
    const first = await submit(pm, [rodItem()]);
    const x1 = await itemIdOf(first.body.jobWorkId, tag + ' Support Rod');
    assert.equal((await pendingRow(x1)).suggested_stock_item_id, null); // nothing remembered yet
    assert.equal((await planOnDc(x1, s1, 4)).status, 201);              // Store maps S1

    const second = await submit(pm, [rodItem()]);
    const x2 = await itemIdOf(second.body.jobWorkId, tag + ' Support Rod');
    const row2 = await pendingRow(x2);
    assert.equal(row2.stock_item_id, null);
    assert.equal(row2.suggested_stock_item_id, s1.id);
    assert.equal(row2.suggested_stock_item_name, s1.name);
    assert.equal((await planOnDc(x2, s3, 4)).status, 201);              // Store overrides with S3

    const third = await submit(pm, [rodItem()]);
    const x3 = await itemIdOf(third.body.jobWorkId, tag + ' Support Rod');
    assert.equal((await pendingRow(x3)).suggested_stock_item_id, s3.id); // latest wins

    // same name typed by hand, and a different BOM row: no suggestion
    const free = await submit(pm, [
      { material_name: tag + ' Support Rod', quantity: 4, unit: 'pcs' },
      { material_name: tag + ' Other Rod', quantity: 4, unit: 'pcs', bom_source: 'bom', bom_item_id: ids.bomRow2 }]);
    assert.equal((await pendingRow(await itemIdOf(free.body.jobWorkId, tag + ' Support Rod'))).suggested_stock_item_id, null);
    assert.equal((await pendingRow(await itemIdOf(free.body.jobWorkId, tag + ' Other Rod'))).suggested_stock_item_id, null);

    // it is only a suggestion: Store sends the stock item explicitly and may pick another
    const ok = await planOnDc(x3, { id: (await pendingRow(x3)).suggested_stock_item_id }, 4);
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    assert.equal(ok.body.dc.items[0].stock_item_id, s3.id);
  });
  await test('PRE-FILL works for revision BOM items too, and an item that already has a stock item is not "suggested"', async () => {
    const s4 = await mkStock('Bracket Stock', '7308');
    const a = await submit(pm, [{ material_name: tag + ' Rev Bracket', quantity: 2, unit: 'pcs', bom_source: 'revision', bom_item_id: ids.revRow }]);
    const xa = await itemIdOf(a.body.jobWorkId, tag + ' Rev Bracket');
    assert.equal((await planOnDc(xa, s4, 2)).status, 201);
    const b = await submit(pm, [{ material_name: tag + ' Rev Bracket', quantity: 2, unit: 'pcs', bom_source: 'revision', bom_item_id: ids.revRow }]);
    const xb = await itemIdOf(b.body.jobWorkId, tag + ' Rev Bracket');
    assert.equal((await pendingRow(xb)).suggested_stock_item_id, s4.id);
    await pool.query('UPDATE job_work_items SET stock_item_id = $1 WHERE id = $2', [stockPlate.id, xb]);
    const withOwn = await pendingRow(xb);
    assert.equal(withOwn.stock_item_id, stockPlate.id);
    assert.equal(withOwn.suggested_stock_item_id, null);
  });
  await test("the PM's HSN is available for the warning: on pending items and on the DC items", async () => {
    const r = await submit(pm, [{ material_name: tag + ' Hsn Item', hsn: '7308', quantity: 1, unit: 'pcs' }]);
    const x = await itemIdOf(r.body.jobWorkId, tag + ' Hsn Item');
    assert.equal((await pendingRow(x)).hsn, '7308');
    const dc = await planOnDc(x, stockPlate, 1); // stockPlate has HSN 7208
    assert.equal(dc.body.dc.items[0].pm_hsn, '7308');
    assert.equal(dc.body.dc.items[0].hsn_code, '7208');
    const detail = await call('GET', '/' + dc.body.dc.id, store);
    assert.equal(detail.body.dc.items[0].pm_hsn, '7308');
  });
  await test('HSN warning rule: warns when clearly different, never when missing or one is the longer form of the other', async () => {
    const { hsnMismatch, hsnWarning } = await import(require('node:url').pathToFileURL(require('node:path').join(__dirname, '../../src/utils/hsn.js')).href);
    assert.equal(hsnMismatch('7308', '7208'), true);
    assert.equal(hsnMismatch('7308', '73089090'), false); // 4-digit vs 8-digit of the same heading
    assert.equal(hsnMismatch('73089090', '7308'), false);
    assert.equal(hsnMismatch(' 7308 ', '7308'), false);
    assert.equal(hsnMismatch('', '7208'), false);
    assert.equal(hsnMismatch('7308', null), false);
    assert.equal(hsnMismatch(undefined, undefined), false);
    assert.equal(hsnMismatch('7308', '8308'), true);
    assert.match(hsnWarning('7308', '7208'), /PM entered 7308, the stock item has 7208.*still continue/);
    assert.equal(hsnWarning('7308', '7308'), '');
  });

  console.log('\nDC edit can add pending items');
  await test('PUT with an extra pending item adds it (same validations as create); request statuses follow', async () => {
    const first = await mkItem(p1, store, `${tag} Edit first`, 1);
    const extraItem = await mkItem(p2, store, `${tag} Edit extra`, 2);
    const created = await call('POST', '/', store, { vendor_id: ids.vendor, items: [{ job_work_item_id: first.itemId, stock_item_id: stockPlate.id, quantity: 1, unit_value: '10' }] });
    const dc = created.body.dc;
    const upd = await call('PUT', `/${dc.id}`, store, { items: [
      { job_work_item_id: first.itemId, stock_item_id: stockPlate.id, quantity: 1, unit_value: '10' },
      { job_work_item_id: extraItem.itemId, stock_item_id: stockPlate.id, quantity: 2, unit_value: '25.50' }] });
    assert.equal(upd.status, 200, JSON.stringify(upd.body));
    assert.equal(upd.body.dc.items.length, 2, 'two items');
    assert.equal(Number(upd.body.dc.total_value), 61, 'total');
    assert.equal(await requestStatus(extraItem.requestId), 'dc_created', 'req status');
    // validations: no stock item, wrong quantity, already on another DC
    const noStock = await mkItem(p1, store, `${tag} Edit nostock`, 1);
    const keep = { job_work_item_id: first.itemId, stock_item_id: stockPlate.id, quantity: 1, unit_value: '10' };
    assert.equal((await call('PUT', `/${dc.id}`, store, { items: [keep, { job_work_item_id: noStock.itemId, quantity: 1, unit_value: '1' }] })).status, 400, 'no stock item');
    assert.equal((await call('PUT', `/${dc.id}`, store, { items: [keep, { job_work_item_id: noStock.itemId, stock_item_id: stockPlate.id, quantity: 9, unit_value: '1' }] })).status, 400, 'wrong qty');
    const other = await mkDc(ids.vendor, 1, '5');
    assert.equal((await call('PUT', `/${dc.id}`, store, { items: [keep, { job_work_item_id: other.it.itemId, stock_item_id: stockPlate.id, quantity: 1, unit_value: '1' }] })).status, 409, 'on other DC');
    assert.equal((await call('GET', `/${dc.id}`, store)).body.dc.items.length, 2, 'unchanged'); // failed edits changed nothing
    assert.equal((await call('PUT', `/${dc.id}`, acc, { items: [keep] })).status, 403, 'acc');
  });

  console.log('\nPM panel (project job work view)');
  await test('own project only; carries DC no., vendor, location, status, days out, sent / returned / pending; no money', async () => {
    const m = await mkDispatched(ids.vendor, 6, '500', p1);
    await ret(m.dc.id, ids.vendor, m.dcItemId, '2');
    const r = await call('GET', `/project/${p1.id}`, pm);
    assert.equal(r.status, 200);
    const item = r.body.requests.flatMap((q) => q.items).find((i) => i.dc_number === m.dc.dc_number);
    assert.ok(item, 'item for the DC');
    assert.equal(item.dc_status, 'partially_returned');
    assert.match(item.where, /^At /);
    assert.ok(Number.isInteger(item.days_out));
    assert.ok(item.since);
    assert.deepEqual([Number(item.quantity), Number(item.returned_quantity), Number(item.pending_quantity)], [6, 2, 4]);
    const flat = JSON.stringify(r.body);
    assert.ok(!/unit_value|total_value|job_charge|gst_amount|cgst|sgst|igst/.test(flat), 'no money fields');
    assert.equal((await call('GET', `/project/${p1.id}`, pm2)).status, 403); // another PM
    assert.equal((await call('GET', `/project/${p2.id}`, pm)).status, 403); // own PM, other project
    assert.equal((await call('GET', `/project/${p2.id}`, pm2)).status, 200);
    assert.equal((await call('GET', `/project/${p1.id}`, management)).status, 200);
  });
  await test('outside report rows carry what the screen shows (days out, current location, pending items)', async () => {
    const rep = await call('GET', '/reports/outside', acc);
    assert.equal(rep.status, 200);
    const row = rep.body.dcs[0];
    for (const f of ['dc_number', 'vendor_name', 'current_location_name', 'days_out', 'pending_value', 'pending_items', 'projects', 'location_since']) {
      assert.ok(row[f] !== null && row[f] !== undefined, `${f} is null`);
    }
    assert.ok(rep.body.summary.pending_value !== null && rep.body.summary.open_dcs >= 1);
  });
}

(async () => {
  try {
    await setup();
    await startServer();
    await run();
  } catch (err) {
    failures.push('setup/run error');
    console.error('\nFatal:', err);
  } finally {
    if (server) server.kill();
    await cleanup();
    await pool.end();
  }
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) { console.log('Failed:', failures.join('; ')); process.exitCode = 1; }
})();
