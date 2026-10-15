// External Job Work v2 - customer material inward ("Customer material received").
// Mounted at /api/ejw  (this file: /inwards...).
//
// Store records material a customer sent (S1 own DC, S2 sent by a third party on the customer's behalf,
// S3 against an open job). One customer DC can arrive in several trucks: each truck is a receipt on the same
// inward. Store sees the component value but never invoice amounts; the PM never sees money (utils/ejw.js).

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { HttpError, wrap, normRole, requireRole, withTransaction, notifyUser, notifyRole } = require('../utils/jobwork');
const { nextNumber } = require('../utils/numbering');
const E = require('../utils/ejw');
const { createRequest } = require('./jobwork_stock_requests');

const router = express.Router();
router.use(authenticateToken);

const { text } = E;
const DOC_KINDS = ['customer_dc', 'supplier_dc', 'eway_bill', 'photo', 'other'];
const READERS = ['store_incharge', 'accountant', 'management'];

// ---------- loading ----------

async function loadInward(db, id, companyId) {
  const head = await db.query(
    `SELECT i.*, c.name AS customer_name, c.gstin AS customer_gstin, c.state AS customer_state, c.email AS customer_email
       FROM ejw_inwards i JOIN master_customers c ON c.id = i.customer_id
      WHERE i.id = $1 AND i.company_id = $2`,
    [id, companyId]
  );
  if (head.rows.length === 0) return null;
  const inward = head.rows[0];
  const items = await db.query(
    `SELECT it.*, st.name AS stock_item_name, (it.stock_item_id IS NULL) AS stock_item_pending, r.receipt_no, w.wo_no,
            (it.qty - it.returned_qty - it.short_closed_qty) AS pending_qty,
            (SELECT id FROM stock_item_requests q WHERE q.ejw_inward_item_id = it.id ORDER BY q.id DESC LIMIT 1) AS stock_request_id,
            (SELECT status FROM stock_item_requests q WHERE q.ejw_inward_item_id = it.id ORDER BY q.id DESC LIMIT 1) AS stock_request_status
       FROM ejw_inward_items it
       LEFT JOIN stock_items st ON st.id = it.stock_item_id
       JOIN ejw_inward_receipts r ON r.id = it.receipt_id
       LEFT JOIN work_orders w ON w.id = it.wo_id
      WHERE it.inward_id = $1 ORDER BY it.id`,
    [id]
  );
  const receipts = await db.query('SELECT * FROM ejw_inward_receipts WHERE inward_id = $1 ORDER BY receipt_no', [id]);
  const documents = await db.query('SELECT * FROM ejw_inward_documents WHERE inward_id = $1 ORDER BY id', [id]);
  const total = items.rows.reduce((sum, i) => sum + Math.round(Number(i.total_value) * 100), 0) / 100;
  return {
    ...inward,
    customer_dc_pending: !text(inward.customer_dc_no),
    total_value: total.toFixed(2),
    receipts: receipts.rows,
    items: items.rows,
    documents: documents.rows
  };
}

async function loadCustomer(client, customerId, companyId) {
  const { rows } = await client.query('SELECT * FROM master_customers WHERE id = $1 AND company_id = $2', [customerId, companyId]);
  if (rows.length === 0) throw new HttpError(404, 'Customer not found');
  if (!rows[0].is_active) throw new HttpError(400, `${rows[0].name} is deactivated; reactivate it in the customer master first`);
  return rows[0];
}

// A job a customer's material can be received against: same customer, not closed.
async function loadWorkOrder(client, woId, companyId, customerId) {
  const { rows } = await client.query('SELECT * FROM work_orders WHERE id = $1 AND company_id = $2 FOR UPDATE', [woId, companyId]);
  if (rows.length === 0) throw new HttpError(404, 'Work order not found');
  const wo = rows[0];
  if (wo.customer_id !== customerId) throw new HttpError(400, `${wo.wo_no} belongs to another customer`);
  if (wo.status === 'closed') throw new HttpError(400, `${wo.wo_no} is closed`);
  return wo;
}

// ---------- items ----------

// An item is either an existing stock item (stock_item_id) or material whose stock item Accounts still has to create
// (request_stock_item: true with a description, unit and optional HSN). The latter is saved at once, with a stock item
// request linked to it, and filled in when Accounts creates or links the stock item.
async function prepareItems(client, companyId, items) {
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'At least one item is required');
  const ids = items.map((i) => parseInt(i && i.stock_item_id, 10));
  const wanted = ids.filter(Number.isInteger);
  const { rows } = await client.query('SELECT id, name, hsn, unit FROM stock_items WHERE id = ANY($1) AND company_id = $2', [wanted, companyId]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const prepared = [];
  for (let n = 0; n < items.length; n += 1) {
    const i = items[n] || {};
    const label = `Item ${n + 1}`;
    const asking = !Number.isInteger(ids[n]) && (i.request_stock_item === true || i.request_stock_item === 'true');
    if (!Number.isInteger(ids[n]) && !asking) throw new HttpError(400, `${label}: choose a stock item, or ask Accounts to create it (request a stock item)`);

    let stock = null;
    let description;
    let unit;
    let hsn = null;
    if (asking) {
      description = text(i.description);
      unit = text(i.unit);
      hsn = text(i.hsn) || null;
      if (!description) throw new HttpError(400, `${label}: describe the item so Accounts can create its stock item`);
      if (description.length > 255) throw new HttpError(400, `${label}: description is too long`);
      if (!unit) throw new HttpError(400, `${label}: unit is required`);
      if (hsn && hsn.length > 50) throw new HttpError(400, `${label}: HSN is too long`);
      const same = await client.query('SELECT name FROM stock_items WHERE company_id = $1 AND LOWER(name) = LOWER($2)', [companyId, description]);
      if (same.rows.length) throw new HttpError(400, `${label}: a stock item named "${same.rows[0].name}" already exists. Pick it from the list instead of requesting it.`);
    } else {
      stock = byId.get(ids[n]);
      if (!stock) throw new HttpError(400, `${label}: stock item not found. Request it from Accounts first.`);
      description = text(i.description) || stock.name;
      unit = text(i.unit) || stock.unit;
      if (description.length > 255) throw new HttpError(400, `${label}: description is too long`);
    }
    const shown = description || label;
    const qty = text(i.qty !== undefined ? i.qty : i.quantity);
    if (!E.QTY_RE.test(qty) || Number(qty) <= 0) throw new HttpError(400, `${label} (${shown}): quantity must be a positive number (up to 3 decimals)`);
    const value = text(i.unit_value);
    if (!E.MONEY_RE.test(value)) throw new HttpError(400, `${label} (${shown}): the value per unit declared on the customer's DC is required (up to 2 decimals)`);
    prepared.push({ stock, request: asking, qty, value, description, unit, hsn: stock ? stock.hsn : hsn });
  }
  return prepared;
}

// Inserts the items and raises the stock item requests for those that need one. Call inside the transaction.
async function insertItems(client, user, inwardId, receiptId, prepared, woId) {
  for (const p of prepared) {
    const id = (await client.query(
      `INSERT INTO ejw_inward_items (inward_id, receipt_id, stock_item_id, description, hsn, qty, unit, unit_value, total_value, wo_id)
       VALUES ($1, $2, $3, $4, $5, $6::numeric, $7, $8::numeric, ROUND($6::numeric * $8::numeric, 2), $9) RETURNING id`,
      [inwardId, receiptId, p.stock ? p.stock.id : null, p.description, p.hsn, p.qty, p.unit, p.value, woId]
    )).rows[0].id;
    if (p.request) {
      // soft: if the same item is already waiting for Accounts, this one just waits with it and is filled in with it
      await createRequest(client, user, { name: p.description, hsn: p.hsn, unit: p.unit, ejw_inward_item_id: id }, { source: 'stock', soft: true });
    }
  }
}

function receiptFields(body) {
  const vehicle = text(body.vehicle_no);
  if (vehicle.length > 50) throw new HttpError(400, 'vehicle_no is too long');
  return { received_date: E.receivedDate(body.received_date), vehicle_no: vehicle || null, eway_bill_no: E.ewayBill(body.eway_bill_no), notes: text(body.notes) || null };
}

// ---------- customer DC checks ----------

// Exactly the same DC number AND date already received from this customer: a hard stop.
async function assertDcNotReceived(client, companyId, customerId, dcNo, dcDate, excludeId = null) {
  const { rows } = await client.query(
    `SELECT id, inward_no FROM ejw_inwards
      WHERE company_id = $1 AND customer_id = $2 AND LOWER(BTRIM(customer_dc_no)) = LOWER($3)
        AND COALESCE(customer_dc_date, DATE '0001-01-01') = COALESCE($4::date, DATE '0001-01-01')
        AND ($5::int IS NULL OR id <> $5)`,
    [companyId, customerId, dcNo, dcDate, excludeId]
  );
  if (rows.length) {
    throw new HttpError(409, `Customer DC ${dcNo}${dcDate ? ` dated ${E.dmy(dcDate)}` : ''} was already received as ${rows[0].inward_no}. If more of it arrived in another truck, add a receipt to that inward instead.`,
      { code: 'DC_ALREADY_RECEIVED', inward_id: rows[0].id, inward_no: rows[0].inward_no });
  }
}

// The same DC number from this customer within the last 365 days (but a different date): worth a look, not an error.
async function dcWarnings(client, companyId, customerId, dcNo, excludeId = null) {
  if (!dcNo) return [];
  const { rows } = await client.query(
    `SELECT id, inward_no, COALESCE(customer_dc_date, received_date) AS on_date
       FROM ejw_inwards
      WHERE company_id = $1 AND customer_id = $2 AND LOWER(BTRIM(customer_dc_no)) = LOWER($3)
        AND COALESCE(customer_dc_date, received_date) >= CURRENT_DATE - 365
        AND ($4::int IS NULL OR id <> $4)
      ORDER BY id`,
    [companyId, customerId, dcNo, excludeId]
  );
  return rows.map((r) => ({
    code: 'DUPLICATE_CUSTOMER_DC',
    message: `This customer already used DC no. ${dcNo} in the last 365 days (${r.inward_no}, ${E.dmy(r.on_date)}). Check this is a different DC.`,
    inward_id: r.id,
    inward_no: r.inward_no
  }));
}

// ---------- notifications ----------

async function announce(client, { companyId, inward, customer, wo, woHasPm, thirdParty, customerDcPending, userId, newReceipt }) {
  const what = newReceipt ? `Another truck of ${customer.name}'s material (${inward.inward_no})` : `${customer.name}'s material (${inward.inward_no})`;
  const data = { inward_id: inward.id, wo_id: wo ? wo.id : null };
  if (!wo) {
    await notifyRole(client, companyId, 'project_manager', 'Customer Material Awaiting Work', `${what} has been received and is waiting for a work order.`, 'ejw_stock_awaiting', null, data);
  } else if (woHasPm) {
    await notifyUser(client, wo.pm_id, 'Customer Material Received', `${what} has been received against ${wo.wo_no}.`, 'ejw_material_received', wo.project_id, data);
  } else {
    const npd = await E.npdOfWorkOrder(client, wo);
    if (npd) {
      await notifyUser(client, npd, 'Material Received, No PM Yet', `${what} has arrived against ${wo.wo_no}, which has no project manager yet. Please assign one.`, 'ejw_inward_no_pm', wo.project_id, data);
    }
  }
  if (thirdParty && customerDcPending) {
    await notifyRole(client, companyId, 'accountant', 'Customer DC Pending', `${inward.inward_no} came from a third party for ${customer.name}. The customer's own DC is still awaited; dispatch is blocked until it is attached.`, 'ejw_customer_dc_pending', null, data);
  }
}

// ---------- create ----------

router.post('/inwards', requireRole('store_incharge'), wrap(async (req, res) => {
  const { company_id: companyId, id: userId, role } = req.user;
  const body = req.body || {};
  const customerId = E.requireInt(body.customer_id, 'customer_id');
  const thirdParty = body.third_party === true || body.third_party === 'true';
  const dcNo = text(body.customer_dc_no);
  const dcDate = E.optionalDate(body.customer_dc_date, 'customer_dc_date');
  if (dcNo.length > 100) throw new HttpError(400, 'customer_dc_no is too long');

  const supplier = {};
  if (thirdParty) {
    supplier.name = text(body.supplier_name);
    supplier.dcNo = text(body.supplier_dc_no);
    supplier.gstin = text(body.supplier_gstin).toUpperCase();
    supplier.dcDate = E.optionalDate(body.supplier_dc_date, 'supplier_dc_date');
    if (!supplier.name) throw new HttpError(400, 'Enter the name of the supplier who sent the material');
    if (!supplier.dcNo) throw new HttpError(400, "Enter the supplier's DC number");
    if (supplier.gstin && !E.GSTIN_RE.test(supplier.gstin)) throw new HttpError(400, 'Supplier GSTIN is not in the GST format');
  } else {
    if (!dcNo) throw new HttpError(400, "Customer DC number is required (tick \"sent by a third party\" if the customer's own DC has not arrived yet)");
    if (!dcDate) throw new HttpError(400, 'Customer DC date is required');
  }
  const receipt = receiptFields(body);
  const againstWo = body.against_wo_id ? E.requireInt(body.against_wo_id, 'against_wo_id') : null;

  const out = await withTransaction(async (client) => {
    const customer = await loadCustomer(client, customerId, companyId);
    const prepared = await prepareItems(client, companyId, body.items);
    const wo = againstWo ? await loadWorkOrder(client, againstWo, companyId, customerId) : null;
    if (dcNo) await assertDcNotReceived(client, companyId, customerId, dcNo, dcDate);
    const warnings = await dcWarnings(client, companyId, customerId, dcNo);

    const inwardNo = await nextNumber(client, companyId, 'IN');
    const inwardId = (await client.query(
      `INSERT INTO ejw_inwards (company_id, inward_no, customer_id, received_date, customer_dc_no, customer_dc_date, third_party,
                                supplier_name, supplier_gstin, supplier_dc_no, supplier_dc_date, eway_bill_no, vehicle_no, notes, received_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
      [companyId, inwardNo, customerId, receipt.received_date, dcNo || null, dcDate, thirdParty, supplier.name || null,
        supplier.gstin || null, supplier.dcNo || null, supplier.dcDate || null, receipt.eway_bill_no, receipt.vehicle_no, receipt.notes, userId]
    )).rows[0].id;
    const receiptId = (await client.query(
      `INSERT INTO ejw_inward_receipts (inward_id, receipt_no, received_date, vehicle_no, eway_bill_no, notes, received_by)
       VALUES ($1, 1, $2, $3, $4, $5, $6) RETURNING id`,
      [inwardId, receipt.received_date, receipt.vehicle_no, receipt.eway_bill_no, receipt.notes, userId]
    )).rows[0].id;
    await insertItems(client, req.user, inwardId, receiptId, prepared, wo ? wo.id : null);

    if (wo && wo.status === 'awaiting_material') {
      await client.query("UPDATE work_orders SET status = 'open', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [wo.id]);
      await E.logProjectHistory(client, wo.project_id, userId, 'Awaiting material', 'Open', `Customer material received (${inwardNo}); the job is open`);
    }
    await announce(client, {
      companyId, inward: { id: inwardId, inward_no: inwardNo }, customer, wo, woHasPm: !!(wo && wo.pm_id),
      thirdParty, customerDcPending: !dcNo, userId, newReceipt: false
    });
    return { inwardId, warnings };
  });
  E.send(res, role, { inward: await loadInward(pool, out.inwardId, companyId), warnings: out.warnings }, 201);
}));

// ---------- another truck of the same inward ----------

router.post('/inwards/:id(\\d+)/receipts', requireRole('store_incharge'), wrap(async (req, res) => {
  const { company_id: companyId, id: userId, role } = req.user;
  const inwardId = parseInt(req.params.id, 10);
  const body = req.body || {};
  const receipt = receiptFields(body);

  const out = await withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM ejw_inwards WHERE id = $1 AND company_id = $2 FOR UPDATE', [inwardId, companyId]);
    if (rows.length === 0) throw new HttpError(404, 'Inward not found');
    const inward = rows[0];
    const customer = await loadCustomer(client, inward.customer_id, companyId);
    const prepared = await prepareItems(client, companyId, body.items);

    // Which job do the new items go to? An explicit against_wo_id; otherwise the one job this inward is
    // already on (when there is exactly one); otherwise none (they wait in "stock awaiting work").
    let woId = null;
    if (body.against_wo_id !== undefined && body.against_wo_id !== null && body.against_wo_id !== '' && Number(body.against_wo_id) !== 0) {
      woId = (await loadWorkOrder(client, E.requireInt(body.against_wo_id, 'against_wo_id'), companyId, inward.customer_id)).id;
    } else if (body.against_wo_id === undefined) {
      const existing = await client.query(
        `SELECT DISTINCT it.wo_id FROM ejw_inward_items it JOIN work_orders w ON w.id = it.wo_id
          WHERE it.inward_id = $1 AND w.status <> 'closed'`, [inwardId]);
      if (existing.rows.length === 1) woId = existing.rows[0].wo_id;
    }
    const wo = woId ? (await client.query('SELECT * FROM work_orders WHERE id = $1 FOR UPDATE', [woId])).rows[0] : null;

    const receiptNo = (await client.query('SELECT COALESCE(MAX(receipt_no), 0) + 1 AS n FROM ejw_inward_receipts WHERE inward_id = $1', [inwardId])).rows[0].n;
    const receiptId = (await client.query(
      `INSERT INTO ejw_inward_receipts (inward_id, receipt_no, received_date, vehicle_no, eway_bill_no, notes, received_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [inwardId, receiptNo, receipt.received_date, receipt.vehicle_no, receipt.eway_bill_no, receipt.notes, userId]
    )).rows[0].id;
    await insertItems(client, req.user, inwardId, receiptId, prepared, woId);

    // more material on a finished inward reopens it
    if (inward.status === 'closed') await client.query("UPDATE ejw_inwards SET status = 'open', closed_at = NULL WHERE id = $1", [inwardId]);
    if (wo && wo.status === 'awaiting_material') {
      await client.query("UPDATE work_orders SET status = 'open', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [wo.id]);
      await E.logProjectHistory(client, wo.project_id, userId, 'Awaiting material', 'Open', `Customer material received (${inward.inward_no}); the job is open`);
    }
    await announce(client, {
      companyId, inward, customer, wo, woHasPm: !!(wo && wo.pm_id), thirdParty: false, customerDcPending: false, userId, newReceipt: true
    });
    return receiptNo;
  });
  const detail = await loadInward(pool, inwardId, companyId);
  E.send(res, role, { inward: detail, receipt_no: out }, 201);
}));

// ---------- the customer's own DC arrives later (S2) ----------

router.post('/inwards/:id(\\d+)/customer-dc', requireRole('store_incharge'), wrap(async (req, res) => {
  const { company_id: companyId, id: userId, role } = req.user;
  const inwardId = parseInt(req.params.id, 10);
  const dcNo = text(req.body && req.body.customer_dc_no);
  const dcDate = E.optionalDate(req.body && req.body.customer_dc_date, 'customer_dc_date');
  if (!dcNo) throw new HttpError(400, 'Customer DC number is required');
  if (dcNo.length > 100) throw new HttpError(400, 'customer_dc_no is too long');
  if (!dcDate) throw new HttpError(400, 'Customer DC date is required');

  const warnings = await withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM ejw_inwards WHERE id = $1 AND company_id = $2 FOR UPDATE', [inwardId, companyId]);
    if (rows.length === 0) throw new HttpError(404, 'Inward not found');
    const inward = rows[0];
    if (text(inward.customer_dc_no)) throw new HttpError(400, `${inward.inward_no} already has customer DC ${inward.customer_dc_no} attached`);
    await assertDcNotReceived(client, companyId, inward.customer_id, dcNo, dcDate, inwardId);
    const found = await dcWarnings(client, companyId, inward.customer_id, dcNo, inwardId);
    await client.query('UPDATE ejw_inwards SET customer_dc_no = $2, customer_dc_date = $3 WHERE id = $1', [inwardId, dcNo, dcDate]);

    const msg = `Customer DC ${dcNo} (${E.dmy(dcDate)}) is now attached to ${inward.inward_no}.`;
    await notifyRole(client, companyId, 'accountant', 'Customer DC Attached', msg, 'ejw_customer_dc_attached', null, { inward_id: inwardId });
    const pms = await client.query(
      `SELECT DISTINCT w.pm_id, w.project_id FROM ejw_inward_items it JOIN work_orders w ON w.id = it.wo_id
        WHERE it.inward_id = $1 AND w.pm_id IS NOT NULL`, [inwardId]);
    for (const p of pms.rows) await notifyUser(client, p.pm_id, 'Customer DC Attached', msg, 'ejw_customer_dc_attached', p.project_id, { inward_id: inwardId });
    return found;
  });
  E.send(res, role, { inward: await loadInward(pool, inwardId, companyId), warnings });
}));

// ---------- an item still waiting for its stock item: Store picks an existing one ----------

router.put('/inwards/:id(\\d+)/items/:itemId(\\d+)/stock-item', requireRole('store_incharge'), wrap(async (req, res) => {
  const { company_id: companyId, role } = req.user;
  const inwardId = parseInt(req.params.id, 10);
  const stockId = E.requireInt(req.body && req.body.stock_item_id, 'stock_item_id');
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT it.id, it.stock_item_id FROM ejw_inward_items it JOIN ejw_inwards i ON i.id = it.inward_id
        WHERE it.id = $1 AND it.inward_id = $2 AND i.company_id = $3 FOR UPDATE OF it`,
      [parseInt(req.params.itemId, 10), inwardId, companyId]
    );
    if (rows.length === 0) throw new HttpError(404, 'Inward item not found');
    if (rows[0].stock_item_id) throw new HttpError(400, 'This item already has a stock item');
    const stock = await client.query('SELECT id, hsn FROM stock_items WHERE id = $1 AND company_id = $2', [stockId, companyId]);
    if (stock.rows.length === 0) throw new HttpError(404, 'Stock item not found');
    await client.query(
      "UPDATE ejw_inward_items SET stock_item_id = $2, hsn = COALESCE(NULLIF(BTRIM(hsn), ''), $3) WHERE id = $1",
      [rows[0].id, stock.rows[0].id, stock.rows[0].hsn]
    );
  });
  E.send(res, role, { inward: await loadInward(pool, inwardId, companyId) });
}));

// ---------- documents: scans / photos of the DCs and e-way bill ----------

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
      cb(null, 'uploads');
    },
    filename: (req, file, cb) => cb(null, `ejw-inward-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 20 * 1024 * 1024 }
});

router.post('/inwards/:id(\\d+)/documents', requireRole('store_incharge'), upload.single('file'), wrap(async (req, res) => {
  const { company_id: companyId, id: userId, role } = req.user;
  const inwardId = parseInt(req.params.id, 10);
  try {
    if (!req.file) throw new HttpError(400, 'No file uploaded');
    const kind = text(req.body.kind) || 'other';
    if (!DOC_KINDS.includes(kind)) throw new HttpError(400, `kind must be one of: ${DOC_KINDS.join(', ')}`);
    await withTransaction(async (client) => {
      const inward = await client.query('SELECT id FROM ejw_inwards WHERE id = $1 AND company_id = $2', [inwardId, companyId]);
      if (inward.rows.length === 0) throw new HttpError(404, 'Inward not found');
      let receiptId = null;
      if (text(req.body.receipt_id)) {
        const r = await client.query('SELECT id FROM ejw_inward_receipts WHERE id = $1 AND inward_id = $2', [parseInt(req.body.receipt_id, 10), inwardId]);
        if (r.rows.length === 0) throw new HttpError(400, 'That receipt does not belong to this inward');
        receiptId = r.rows[0].id;
      }
      await client.query(
        'INSERT INTO ejw_inward_documents (inward_id, receipt_id, kind, file_name, file_path, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6)',
        [inwardId, receiptId, kind, req.file.originalname, `/uploads/${req.file.filename}`, userId]
      );
    });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    throw err;
  }
  E.send(res, role, { inward: await loadInward(pool, inwardId, companyId) }, 201);
}));

// ---------- reading ----------

router.get('/inwards', requireRole(...READERS), wrap(async (req, res) => {
  const where = ['i.company_id = $1'];
  const values = [req.user.company_id];
  const add = (sql, v) => { values.push(v); where.push(sql.replace('?', `$${values.length}`)); };
  if (req.query.customer_id) add('i.customer_id = ?', E.requireInt(req.query.customer_id, 'customer_id'));
  if (req.query.status) {
    if (!['open', 'closed'].includes(req.query.status)) throw new HttpError(400, 'Unknown status');
    add('i.status = ?', req.query.status);
  }
  if (req.query.dc_pending === '1') where.push("NULLIF(BTRIM(i.customer_dc_no), '') IS NULL");
  if (req.query.from) add('i.received_date >= ?::date', E.optionalDate(req.query.from, 'from'));
  if (req.query.to) add('i.received_date <= ?::date', E.optionalDate(req.query.to, 'to'));
  const search = text(req.query.search);
  if (search) {
    values.push(search);
    where.push(`(i.inward_no ILIKE '%' || $${values.length} || '%' OR i.customer_dc_no ILIKE '%' || $${values.length} || '%')`);
  }
  const { rows } = await pool.query(
    `SELECT i.id, i.inward_no, i.customer_id, c.name AS customer_name, i.received_date, i.customer_dc_no, i.customer_dc_date,
            i.third_party, i.supplier_name, i.status, (NULLIF(BTRIM(i.customer_dc_no), '') IS NULL) AS customer_dc_pending,
            (SELECT COUNT(*)::int FROM ejw_inward_items WHERE inward_id = i.id) AS item_count,
            (SELECT COUNT(*)::int FROM ejw_inward_receipts WHERE inward_id = i.id) AS receipt_count,
            (SELECT COALESCE(SUM(total_value), 0) FROM ejw_inward_items WHERE inward_id = i.id) AS total_value
       FROM ejw_inwards i JOIN master_customers c ON c.id = i.customer_id
      WHERE ${where.join(' AND ')} ORDER BY i.id DESC LIMIT 300`,
    values
  );
  E.send(res, req.user.role, { inwards: rows });
}));

router.get('/inwards/:id(\\d+)', requireRole(...READERS), wrap(async (req, res) => {
  const inward = await loadInward(pool, parseInt(req.params.id, 10), req.user.company_id);
  if (!inward) throw new HttpError(404, 'Inward not found');
  E.send(res, req.user.role, { inward });
}));

// The message Store sends the customer when material arrives from a third party (S2).
router.get('/inwards/:id(\\d+)/acknowledgment', requireRole(...READERS), wrap(async (req, res) => {
  const inward = await loadInward(pool, parseInt(req.params.id, 10), req.user.company_id);
  if (!inward) throw new HttpError(404, 'Inward not found');
  if (!inward.third_party) throw new HttpError(400, 'An acknowledgment is only needed for material sent by a third party');
  const company = (await pool.query('SELECT name FROM companies WHERE id = $1', [req.user.company_id])).rows[0];
  const message = E.buildAcknowledgment({
    inward, customer: { name: inward.customer_name, email: inward.customer_email }, items: inward.items, companyName: company ? company.name : ''
  });
  res.json({ acknowledgment: message });
}));

module.exports = router;
module.exports.loadInward = loadInward;
