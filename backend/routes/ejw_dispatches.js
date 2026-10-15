// External Job Work v2 - dispatch back to the customer. Mounted at /api/ejw.
//
// ONE dispatch makes TWO documents:
//   delivery challan  SE/DC/....   component lines (description, HSN, qty, value, customer DC ref), NO GST
//   tax invoice       SE/INV/....  the JOB CHARGE only (SAC 998875 by default), GST split from the two GSTINs
// A dispatch is a draft until Accounts issues it. Numbers are allocated on issue (a draft leaves no gap) and a
// cancelled dispatch keeps its numbers for good. Issuing adds to returned_qty (the knock-off); cancelling takes
// it back. Short-close (Accounts only) writes off quantity that will never return, with a reason.

const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { HttpError, wrap, requireRole, withTransaction, GST_STATE_CODES, stateOf } = require('../utils/jobwork');
const E = require('../utils/ejw');
const { resolveNumber, peekNumber } = require('../utils/numbering');
const { recomputeInward, recomputeWorkOrder } = require('../utils/ejwStatus');

const router = express.Router();
router.use(authenticateToken);
const { text } = E;
const SAC_RE = /^\d{4,8}$/;
const READERS = ['accountant', 'management', 'store_incharge'];

const cents = (v) => Math.round(Number(v) * 100);
const money = (c) => (c / 100).toFixed(2);
const titleCase = (s) => String(s).replace(/\b\w/g, (c) => c.toUpperCase());

// Place of supply on the tax invoice: the customer's state, with its GST code (from the GSTIN, else from the state name).
function placeOfSupply(gstin, stateText) {
  const name = stateOf(gstin, stateText);
  if (!name) return { state: null, code: null };
  const code = Object.keys(GST_STATE_CODES).find((k) => GST_STATE_CODES[k] === name) || null;
  return { state: titleCase(name), code };
}

// ---------- one calculation for preview, draft and issue ----------

async function prepare(client, user, body, { lock = false } = {}) {
  const companyId = user.company_id;
  const woId = E.requireInt(body.wo_id, 'wo_id');
  const wo = (await client.query(
    `SELECT w.*, c.id AS cust_id, c.name AS cust_name, c.gstin AS cust_gstin, c.billing_address AS cust_address, c.state AS cust_state
       FROM work_orders w JOIN master_customers c ON c.id = w.customer_id
      WHERE w.id = $1 AND w.company_id = $2 ${lock ? 'FOR UPDATE OF w' : ''}`, [woId, companyId])).rows[0];
  if (!wo) throw new HttpError(404, 'Work order not found');
  if (wo.status === 'closed') throw new HttpError(400, `${wo.wo_no} is closed`);

  if (!Array.isArray(body.items) || body.items.length === 0) throw new HttpError(400, 'Choose at least one item to dispatch');
  const ids = body.items.map((i) => parseInt(i && i.inward_item_id, 10));
  if (ids.some((n) => !Number.isInteger(n)) || new Set(ids).size !== ids.length) throw new HttpError(400, 'Each item must be listed once, with inward_item_id');
  const stock = (await client.query(
    `SELECT it.*, i.customer_dc_no, i.inward_no FROM ejw_inward_items it JOIN ejw_inwards i ON i.id = it.inward_id
      WHERE it.id = ANY($1) AND it.wo_id = $2 ORDER BY it.id ${lock ? 'FOR UPDATE OF it' : ''}`, [ids, woId])).rows;
  const byId = new Map(stock.map((s) => [s.id, s]));

  let componentCents = 0;
  const lines = [];
  for (let n = 0; n < ids.length; n += 1) {
    const s = byId.get(ids[n]);
    if (!s) throw new HttpError(400, `Item ${n + 1} is not on ${wo.wo_no}`);
    const qty = text(body.items[n].qty);
    if (!E.QTY_RE.test(qty) || Number(qty) <= 0) throw new HttpError(400, `${s.description}: quantity must be a positive number (up to 3 decimals)`);
    const room = Number(s.ready_qty) - Number(s.returned_qty);
    if (Number(qty) > room) {
      throw new HttpError(400, `${s.description}: only ${room} ${s.unit} is confirmed ready and not yet dispatched, you asked for ${Number(qty)}`);
    }
    const value = (await client.query('SELECT ROUND($1::numeric * $2::numeric, 2) AS v', [qty, s.unit_value])).rows[0].v;
    componentCents += cents(value);
    lines.push({ inward_item_id: s.id, description: s.description, hsn: s.hsn, qty, unit: s.unit, unit_value: s.unit_value, value, customer_dc_no: s.customer_dc_no, inward_no: s.inward_no });
  }

  const charge = text(body.job_charge);
  if (!E.MONEY_RE.test(charge) || Number(charge) <= 0) throw new HttpError(400, 'job_charge must be an amount above zero (up to 2 decimals)');
  const chargeText = money(cents(charge));
  const sac = text(body.sac_code) || '998875';
  if (!SAC_RE.test(sac)) throw new HttpError(400, 'SAC code must be 4 to 8 digits');
  const tax = await E.jobChargeTax(client, companyId, { gstin: wo.cust_gstin, state: wo.cust_state }, charge, body.gst_rate_id);

  const componentValue = money(componentCents);
  const dispatchTotal = money(componentCents + cents(tax.invoice_total));
  const company = (await client.query('SELECT gst_number, state FROM companies WHERE id = $1', [companyId])).rows[0] || {};
  const eway = E.ewayRequirementFor({ total: dispatchTotal, partyGstin: wo.cust_gstin, partyState: wo.cust_state, companyGstin: company.gst_number, companyState: company.state });

  // dispatch is blocked without the customer's PO number, or while any customer DC is still to be attached
  const blockers = [];
  if (!text(wo.customer_po_no)) blockers.push(`${wo.wo_no} has no customer PO number. Record it on the work order first.`);
  for (const l of lines) {
    if (!text(l.customer_dc_no)) blockers.push(`${l.description}: the customer's delivery challan for ${l.inward_no} has not been attached yet.`);
  }

  return {
    wo, lines, tax, componentValue, dispatchTotal, eway, blockers, charge: chargeText, sac,
    jobDescription: text(body.job_description) || null,
    processText: text(body.process_text) || text(wo.description) || null,
    pos: placeOfSupply(wo.cust_gstin, wo.cust_state),
    vehicleNo: text(body.vehicle_no) || null,
    ewayBillNo: E.ewayBill(body.eway_bill_no)
  };
}

const assertNoBlockers = (p) => { if (p.blockers.length) throw new HttpError(400, `Dispatch is blocked: ${p.blockers.join(' ')}`); };

function summary(p) {
  return {
    work_order: { id: p.wo.id, wo_no: p.wo.wo_no, customer_po_no: p.wo.customer_po_no },
    customer: { id: p.wo.cust_id, name: p.wo.cust_name, gstin: p.wo.cust_gstin, state: p.wo.cust_state },
    items: p.lines,
    component_value: p.componentValue,
    sac_code: p.sac,
    process_text: p.processText,
    place_of_supply: p.pos,
    job_charge: p.charge,
    taxable_value: p.charge,
    gst_split: p.tax.split,
    gst_rate: p.tax.gst_rate,
    gst_amount: p.tax.gst,
    cgst_amount: p.tax.cgst,
    sgst_amount: p.tax.sgst,
    igst_amount: p.tax.igst,
    invoice_total: p.tax.invoice_total,
    dispatch_total: p.dispatchTotal,
    eway: p.eway,
    blockers: p.blockers
  };
}

async function loadDispatch(db, id, companyId) {
  const head = (await db.query(
    `SELECT d.*, w.wo_no, w.customer_po_no, w.project_id FROM ejw_dispatches d JOIN work_orders w ON w.id = d.wo_id
      WHERE d.id = $1 AND d.company_id = $2`, [id, companyId])).rows[0];
  if (!head) return null;
  const items = (await db.query('SELECT * FROM ejw_dispatch_items WHERE dispatch_id = $1 ORDER BY id', [id])).rows;
  return { ...head, items };
}

async function saveDraft(client, user, p, body, existingId) {
  const cols = [p.wo.id, p.wo.cust_id, p.wo.cust_name, p.wo.cust_gstin, p.wo.cust_address, p.wo.cust_state, p.ewayBillNo, p.vehicleNo,
    p.componentValue, p.jobDescription, p.sac, p.charge, p.tax.gst_rate_id, p.tax.gst, p.tax.cgst, p.tax.sgst, p.tax.igst, p.tax.invoice_total, p.dispatchTotal, p.processText];
  let id = existingId;
  if (id) {
    await client.query(
      `UPDATE ejw_dispatches SET wo_id=$2, customer_id=$3, customer_name=$4, customer_gstin=$5, customer_address=$6, customer_state=$7, eway_bill_no=$8,
              vehicle_no=$9, component_value=$10, job_description=$11, sac_code=$12, taxable_value=$13, gst_rate_id=$14, gst_amount=$15, cgst_amount=$16,
              sgst_amount=$17, igst_amount=$18, invoice_total=$19, dispatch_total=$20, process_text=$21, updated_at=CURRENT_TIMESTAMP WHERE id=$1`,
      [id, ...cols]
    );
    await client.query('DELETE FROM ejw_dispatch_items WHERE dispatch_id = $1', [id]);
  } else {
    id = (await client.query(
      `INSERT INTO ejw_dispatches (company_id, wo_id, customer_id, customer_name, customer_gstin, customer_address, customer_state, eway_bill_no,
              vehicle_no, component_value, job_description, sac_code, taxable_value, gst_rate_id, gst_amount, cgst_amount, sgst_amount, igst_amount,
              invoice_total, dispatch_total, process_text, created_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,'draft') RETURNING id`,
      [user.company_id, ...cols, user.id]
    )).rows[0].id;
  }
  for (const l of p.lines) {
    await client.query(
      `INSERT INTO ejw_dispatch_items (dispatch_id, inward_item_id, description, hsn, qty, unit, unit_value, value, customer_dc_no)
       VALUES ($1,$2,$3,$4,$5::numeric,$6,$7,$8,$9)`,
      [id, l.inward_item_id, l.description, l.hsn, l.qty, l.unit, l.unit_value, l.value, l.customer_dc_no]
    );
  }
  return id;
}

// ---------- preview / draft ----------

// What the two documents would look like and which blockers stand in the way. Writes nothing.
router.post('/dispatches/preview', requireRole('accountant', 'management'), wrap(async (req, res) => {
  const p = await prepare(pool, req.user, req.body || {});
  const date = text(req.body.invoice_date) || E.todayStr();
  E.send(res, req.user.role, {
    ...summary(p),
    next_dc_no: await peekNumber(pool, req.user.company_id, 'DC'),
    next_invoice_no: await peekNumber(pool, req.user.company_id, 'INV', { date })
  });
}));

router.post('/dispatches', requireRole('accountant'), wrap(async (req, res) => {
  const body = req.body || {};
  const id = await withTransaction(async (client) => {
    const p = await prepare(client, req.user, body);
    assertNoBlockers(p);
    return saveDraft(client, req.user, p, body, null);
  });
  E.send(res, req.user.role, { dispatch: await loadDispatch(pool, id, req.user.company_id) }, 201);
}));

router.put('/dispatches/:id(\\d+)', requireRole('accountant'), wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await withTransaction(async (client) => {
    const d = (await client.query('SELECT status FROM ejw_dispatches WHERE id = $1 AND company_id = $2 FOR UPDATE', [id, req.user.company_id])).rows[0];
    if (!d) throw new HttpError(404, 'Dispatch not found');
    if (d.status !== 'draft') throw new HttpError(400, `Only a draft can be edited (this one is ${d.status})`);
    const p = await prepare(client, req.user, req.body || {});
    assertNoBlockers(p);
    await saveDraft(client, req.user, p, req.body, id);
  });
  E.send(res, req.user.role, { dispatch: await loadDispatch(pool, id, req.user.company_id) });
}));

router.delete('/dispatches/:id(\\d+)', requireRole('accountant'), wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await withTransaction(async (client) => {
    const d = (await client.query('SELECT status FROM ejw_dispatches WHERE id = $1 AND company_id = $2 FOR UPDATE', [id, req.user.company_id])).rows[0];
    if (!d) throw new HttpError(404, 'Dispatch not found');
    if (d.status !== 'draft') throw new HttpError(400, `Only a draft can be deleted (this one is ${d.status}); cancel it with a reason instead`);
    await client.query('DELETE FROM ejw_dispatches WHERE id = $1', [id]);
  });
  res.json({ status: 'success', message: 'Draft deleted' });
}));

// ---------- issue: draft -> issued, both numbers, knock-off ----------

router.post('/dispatches/:id(\\d+)/issue', requireRole('accountant'), wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const body = req.body || {};
  await withTransaction(async (client) => {
    const d = (await client.query('SELECT * FROM ejw_dispatches WHERE id = $1 AND company_id = $2 FOR UPDATE', [id, req.user.company_id])).rows[0];
    if (!d) throw new HttpError(404, 'Dispatch not found');
    if (d.status !== 'draft') throw new HttpError(400, `Only a draft can be issued (this one is ${d.status})`);

    const items = (await client.query('SELECT inward_item_id, qty FROM ejw_dispatch_items WHERE dispatch_id = $1 ORDER BY id', [id])).rows;
    // everything is re-checked now, under lock: the customer's GSTIN, the ready quantity and the documents may have moved on
    const p = await prepare(client, req.user, {
      wo_id: d.wo_id, items: items.map((i) => ({ inward_item_id: i.inward_item_id, qty: String(i.qty) })), job_charge: String(d.taxable_value),
      gst_rate_id: d.gst_rate_id, sac_code: d.sac_code, job_description: d.job_description, process_text: d.process_text,
      vehicle_no: body.vehicle_no !== undefined ? body.vehicle_no : d.vehicle_no,
      eway_bill_no: body.eway_bill_no !== undefined ? body.eway_bill_no : d.eway_bill_no
    }, { lock: true });
    assertNoBlockers(p);
    if (p.eway.required && !p.ewayBillNo) throw new HttpError(400, `E-way bill number is required: ${p.eway.reasons.join('; ')}`);

    const dcDate = E.optionalDate(body.dc_date, 'dc_date') || E.todayStr();
    const invDate = E.optionalDate(body.invoice_date, 'invoice_date') || dcDate;
    if (dcDate > E.todayStr() || invDate > E.todayStr()) throw new HttpError(400, 'Document dates cannot be in the future');
    const dc = await resolveNumber(client, req.user.company_id, 'DC', { typed: body.dc_no, date: dcDate, maxLength: 16 });
    const inv = await resolveNumber(client, req.user.company_id, 'INV', { typed: body.invoice_no, date: invDate, maxLength: 16 });

    for (const l of p.lines) {
      await client.query('UPDATE ejw_inward_items SET returned_qty = returned_qty + $2::numeric WHERE id = $1', [l.inward_item_id, l.qty]);
    }
    await client.query(
      `UPDATE ejw_dispatches SET status = 'issued', dc_no = $2, dc_date = $3, invoice_no = $4, invoice_date = $5, invoice_fy = $6,
              eway_bill_no = $7, vehicle_no = $8, component_value = $9, gst_rate_id = $10, gst_amount = $11, cgst_amount = $12, sgst_amount = $13,
              igst_amount = $14, invoice_total = $15, dispatch_total = $16, customer_gstin = $17, customer_state = $18, customer_address = $19,
              customer_name = $20, issued_by = $21, place_of_supply_state = $22, place_of_supply_code = $23, process_text = $24,
              issued_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id, dc.number, dcDate, inv.number, invDate, inv.fy, p.ewayBillNo, p.vehicleNo, p.componentValue, p.tax.gst_rate_id, p.tax.gst, p.tax.cgst,
        p.tax.sgst, p.tax.igst, p.tax.invoice_total, p.dispatchTotal, p.wo.cust_gstin, p.wo.cust_state, p.wo.cust_address, p.wo.cust_name, req.user.id,
        p.pos.state, p.pos.code, p.processText]
    );
    const inwardIds = (await client.query('SELECT DISTINCT inward_id FROM ejw_inward_items WHERE id = ANY($1)', [p.lines.map((l) => l.inward_item_id)])).rows;
    for (const r of inwardIds) await recomputeInward(client, r.inward_id);
    const status = await recomputeWorkOrder(client, d.wo_id, req.user.id);
    await E.notifyRole(client, req.user.company_id, 'store_incharge', 'Material Dispatched',
      `${p.wo.wo_no}: delivery challan ${dc.number} issued to ${p.wo.cust_name}${status === 'closed' ? ' (work order closed)' : ''}.`,
      'ejw_dispatch_issued', p.wo.project_id, { dispatch_id: id, wo_id: d.wo_id });
  });
  E.send(res, req.user.role, { dispatch: await loadDispatch(pool, id, req.user.company_id) });
}));

// ---------- cancel an issued dispatch: reverses the knock-off, keeps the numbers ----------

router.post('/dispatches/:id(\\d+)/cancel', requireRole('accountant'), wrap(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const reason = text(req.body && req.body.reason);
  if (!reason) throw new HttpError(400, 'A reason is required to cancel a dispatch');
  await withTransaction(async (client) => {
    const d = (await client.query('SELECT * FROM ejw_dispatches WHERE id = $1 AND company_id = $2 FOR UPDATE', [id, req.user.company_id])).rows[0];
    if (!d) throw new HttpError(404, 'Dispatch not found');
    if (d.status === 'cancelled') throw new HttpError(409, 'This dispatch is already cancelled');
    if (d.status !== 'issued') throw new HttpError(400, 'A draft has no numbers yet: delete it instead');
    const items = (await client.query('SELECT inward_item_id, qty FROM ejw_dispatch_items WHERE dispatch_id = $1 ORDER BY inward_item_id', [id])).rows;
    await client.query('SELECT id FROM ejw_inward_items WHERE id = ANY($1) ORDER BY id FOR UPDATE', [items.map((i) => i.inward_item_id)]);
    for (const i of items) {
      const r = await client.query('UPDATE ejw_inward_items SET returned_qty = returned_qty - $2::numeric WHERE id = $1 AND returned_qty >= $2::numeric', [i.inward_item_id, i.qty]);
      if (r.rowCount === 0) throw new HttpError(409, 'The returned quantity no longer covers this dispatch; it cannot be reversed');
    }
    await client.query(
      "UPDATE ejw_dispatches SET status = 'cancelled', cancel_reason = $2, cancelled_by = $3, cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id, reason, req.user.id]
    );
    const inwardIds = (await client.query('SELECT DISTINCT inward_id FROM ejw_inward_items WHERE id = ANY($1)', [items.map((i) => i.inward_item_id)])).rows;
    for (const r of inwardIds) await recomputeInward(client, r.inward_id);
    await recomputeWorkOrder(client, d.wo_id, req.user.id);
    await E.notifyRole(client, req.user.company_id, 'store_incharge', 'Dispatch Cancelled',
      `Delivery challan ${d.dc_no} was cancelled: ${reason}. The material is back on the work order.`, 'ejw_dispatch_cancelled', null, { dispatch_id: id, wo_id: d.wo_id });
  });
  E.send(res, req.user.role, { dispatch: await loadDispatch(pool, id, req.user.company_id) });
}));

// ---------- short-close (Accounts only) ----------

router.post('/inward-items/:itemId(\\d+)/short-close', requireRole('accountant'), wrap(async (req, res) => {
  const itemId = parseInt(req.params.itemId, 10);
  const qty = text(req.body && req.body.qty);
  const reason = text(req.body && req.body.reason);
  if (!E.QTY_RE.test(qty) || Number(qty) <= 0) throw new HttpError(400, 'qty must be a positive number (up to 3 decimals)');
  if (!reason) throw new HttpError(400, 'A reason is required to short-close');
  const out = await withTransaction(async (client) => {
    const it = (await client.query(
      `SELECT it.*, i.company_id FROM ejw_inward_items it JOIN ejw_inwards i ON i.id = it.inward_id
        WHERE it.id = $1 AND i.company_id = $2 FOR UPDATE OF it`, [itemId, req.user.company_id])).rows[0];
    if (!it) throw new HttpError(404, 'Item not found');
    const open = Number(it.qty) - Number(it.returned_qty) - Number(it.short_closed_qty);
    if (Number(qty) > open) throw new HttpError(400, `${it.description}: only ${open} ${it.unit} is still open, you tried to short-close ${Number(qty)}`);
    await client.query('INSERT INTO ejw_short_closes (company_id, inward_item_id, qty, reason, closed_by) VALUES ($1, $2, $3::numeric, $4, $5)', [req.user.company_id, itemId, qty, reason, req.user.id]);
    await client.query('UPDATE ejw_inward_items SET short_closed_qty = short_closed_qty + $2::numeric WHERE id = $1', [itemId, qty]);
    const inwardClosed = await recomputeInward(client, it.inward_id);
    const woStatus = it.wo_id ? await recomputeWorkOrder(client, it.wo_id, req.user.id) : null;
    return { inward_closed: inwardClosed, work_order_status: woStatus };
  });
  E.send(res, req.user.role, { status: 'success', ...out });
}));

// ---------- reading ----------

router.get('/dispatches', requireRole(...READERS), wrap(async (req, res) => {
  const woId = parseInt(req.query.wo_id, 10) || null;
  const status = text(req.query.status);
  const { rows } = await pool.query(
    `SELECT d.id, d.wo_id, w.wo_no, d.status, d.dc_no, d.dc_date, d.invoice_no, d.invoice_date, d.customer_name, d.component_value,
            d.taxable_value, d.invoice_total, d.dispatch_total, d.eway_bill_no, d.created_at
       FROM ejw_dispatches d JOIN work_orders w ON w.id = d.wo_id
      WHERE d.company_id = $1 AND ($2::int IS NULL OR d.wo_id = $2) AND ($3 = '' OR d.status = $3)
      ORDER BY d.id DESC`, [req.user.company_id, woId, status]);
  E.send(res, req.user.role, { dispatches: rows });
}));

router.get('/dispatches/:id(\\d+)', requireRole(...READERS), wrap(async (req, res) => {
  const d = await loadDispatch(pool, parseInt(req.params.id, 10), req.user.company_id);
  if (!d) throw new HttpError(404, 'Dispatch not found');
  E.send(res, req.user.role, { dispatch: d });
}));

// ---------- work orders with material confirmed ready, for the Accounts list ----------

router.get('/ready-for-dispatch', requireRole('accountant', 'management'), wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT w.id AS wo_id, w.wo_no, w.status, w.customer_po_no, c.id AS customer_id, c.name AS customer_name,
            it.id AS item_id, it.description, it.hsn, it.unit, it.qty, it.ready_qty, it.returned_qty,
            (it.ready_qty - it.returned_qty) AS dispatchable_qty, it.unit_value,
            i.inward_no, i.customer_dc_no, (NULLIF(BTRIM(i.customer_dc_no), '') IS NULL) AS customer_dc_pending,
            (SELECT COUNT(*)::int FROM ejw_dispatches d WHERE d.wo_id = w.id AND d.status = 'draft') AS draft_count
       FROM work_orders w
       JOIN master_customers c ON c.id = w.customer_id
       JOIN ejw_inward_items it ON it.wo_id = w.id
       JOIN ejw_inwards i ON i.id = it.inward_id
      WHERE w.company_id = $1 AND w.status <> 'closed' AND it.ready_qty > it.returned_qty
      ORDER BY w.id DESC, it.id`, [req.user.company_id]);
  const byWo = new Map();
  for (const r of rows) {
    if (!byWo.has(r.wo_id)) {
      byWo.set(r.wo_id, { wo_id: r.wo_id, wo_no: r.wo_no, status: r.status, customer_id: r.customer_id, customer_name: r.customer_name,
        customer_po_no: r.customer_po_no, draft_count: r.draft_count, blockers: [], items: [] });
      if (!text(r.customer_po_no)) byWo.get(r.wo_id).blockers.push('Customer PO number is missing');
    }
    const g = byWo.get(r.wo_id);
    if (r.customer_dc_pending) g.blockers.push(`Customer DC for ${r.inward_no} is not attached`);
    g.items.push({ item_id: r.item_id, description: r.description, hsn: r.hsn, unit: r.unit, dispatchable_qty: r.dispatchable_qty, unit_value: r.unit_value,
      inward_no: r.inward_no, customer_dc_no: r.customer_dc_no, customer_dc_pending: r.customer_dc_pending });
  }
  const list = [...byWo.values()].map((g) => ({ ...g, blockers: [...new Set(g.blockers)] }));
  E.send(res, req.user.role, { work_orders: list });
}));

// ---------- our own details printed on every document ----------

router.get('/company-profile', requireRole('accountant', 'management'), wrap(async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, address, gst_number, state FROM companies WHERE id = $1', [req.user.company_id]);
  res.json({ company: rows[0] });
}));

router.put('/company-profile', requireRole('management'), wrap(async (req, res) => {
  const b = req.body || {};
  const sets = []; const values = [req.user.company_id];
  const put = (col, v) => { values.push(v); sets.push(`${col} = $${values.length}`); };
  if (b.address !== undefined) { const a = text(b.address); if (a.length > 1000) throw new HttpError(400, 'address is too long'); put('address', a || null); }
  if (b.gst_number !== undefined) {
    const g = text(b.gst_number).toUpperCase();
    if (g && !E.GSTIN_RE.test(g)) throw new HttpError(400, 'GSTIN must be 15 characters in the GST format (e.g. 29ABCDE1234F1Z5)');
    if (g && !GST_STATE_CODES[g.slice(0, 2)]) throw new HttpError(400, `GSTIN starts with ${g.slice(0, 2)}, which is not a GST state code`);
    put('gst_number', g || null);
    if (g) put('state', titleCase(GST_STATE_CODES[g.slice(0, 2)]));
  }
  if (b.state !== undefined && b.gst_number === undefined) put('state', text(b.state) || null);
  if (sets.length === 0) throw new HttpError(400, 'Nothing to change');
  const { rows } = await pool.query(`UPDATE companies SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, address, gst_number, state`, values);
  res.json({ company: rows[0] });
}));

module.exports = router;
