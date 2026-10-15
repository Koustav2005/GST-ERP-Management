// External Job Work v2 - issuing customer material to the shop floor.
// Mounted at /api/external-jobwork-materials (before the old router, whose duplicate routes are removed).
//
// The PM asks for material of HIS work order; Store hands it over (fulfil) or the worker collects it by QR scan.
// BOTH go through issueRequest(): the one and only place stock is deducted. It locks the request and the inward
// items, checks what is available (qty - issued - short-closed), raises issued_qty, writes the transaction, and
// either does all of that or none of it. Nothing is swallowed: any error rolls the whole thing back.

const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { HttpError, wrap, normRole, requireRole, withTransaction, notifyUser, notifyRole } = require('../utils/jobwork');
const E = require('../utils/ejw');
const { recomputeWorkOrder } = require('../utils/ejwStatus');

const router = express.Router();
router.use(authenticateToken);

const { text } = E;
const AVAILABLE = 'GREATEST(0, it.qty - it.issued_qty - it.short_closed_qty)';

// ---------- loading ----------

async function loadRequest(db, id, companyId) {
  const head = await db.query(
    `SELECT r.*, p.name AS project_name, w.name AS worker_name, pm.name AS requested_by_name, wo.id AS wo_id, wo.wo_no, wo.pm_id
       FROM external_jobwork_outstock_requests r
       JOIN projects p ON p.id = r.project_id
       JOIN users w ON w.id = r.worker_id
       JOIN users pm ON pm.id = r.requested_by
       LEFT JOIN work_orders wo ON wo.project_id = r.project_id
      WHERE r.id = $1 AND r.company_id = $2`,
    [id, companyId]
  );
  if (head.rows.length === 0) return null;
  const items = await db.query(
    `SELECT ri.*, i.inward_no, i.customer_dc_no, ${AVAILABLE} AS available_now
       FROM external_jobwork_outstock_request_items ri
       LEFT JOIN ejw_inward_items it ON it.id = ri.ejw_inward_item_id
       LEFT JOIN ejw_inwards i ON i.id = it.inward_id
      WHERE ri.request_id = $1 ORDER BY ri.id`,
    [id]
  );
  return { ...head.rows[0], items: items.rows };
}

// What the PM can ask for: items of this project's work order that Store has not already handed out.
async function availableFor(db, projectId, companyId) {
  const { rows } = await db.query(
    `SELECT it.id, it.id AS ejw_inward_item_id, it.description AS material_name, it.unit, it.hsn AS hsn_code,
            it.qty AS received_quantity, it.issued_qty, ${AVAILABLE} AS available_quantity,
            i.inward_no, i.customer_dc_no, w.id AS wo_id, w.wo_no
       FROM ejw_inward_items it
       JOIN ejw_inwards i ON i.id = it.inward_id
       JOIN work_orders w ON w.id = it.wo_id
      WHERE w.project_id = $1 AND w.company_id = $2 AND w.status <> 'closed' AND it.stock_item_id IS NOT NULL
        AND ${AVAILABLE} > 0
      ORDER BY it.id`,
    [projectId, companyId]
  );
  return rows;
}

async function workOrderOfProject(db, projectId, companyId) {
  const { rows } = await db.query(
    `SELECT w.id, w.wo_no, w.pm_id, w.status, w.project_id FROM work_orders w
      WHERE w.project_id = $1 AND w.company_id = $2`, [projectId, companyId]);
  return rows[0] || null;
}

// ---------- what can be asked for ----------

router.get('/project/:projectId(\\d+)/available', requireRole('project_manager', 'store_incharge'), wrap(async (req, res) => {
  const projectId = parseInt(req.params.projectId, 10);
  const wo = await workOrderOfProject(pool, projectId, req.user.company_id);
  if (!wo) throw new HttpError(404, 'This project has no work order. Only external job work projects with customer material can issue material.');
  if (normRole(req.user.role) === 'project_manager' && wo.pm_id !== req.user.id) throw new HttpError(403, 'This work order is assigned to another project manager');
  E.send(res, req.user.role, { work_order: { id: wo.id, wo_no: wo.wo_no, status: wo.status }, materials: await availableFor(pool, projectId, req.user.company_id) });
}));

// ---------- the PM raises a request ----------

router.post('/request', requireRole('project_manager'), wrap(async (req, res) => {
  const { company_id: companyId, id: userId, role } = req.user;
  const body = req.body || {};
  const projectId = E.requireInt(body.project_id, 'project_id');
  const workerId = E.requireInt(body.worker_id, 'worker_id');
  if (!Array.isArray(body.items) || body.items.length === 0) throw new HttpError(400, 'Choose at least one item');

  const requestId = await withTransaction(async (client) => {
    const wo = await workOrderOfProject(client, projectId, companyId);
    if (!wo) throw new HttpError(404, 'This project has no work order');
    if (wo.pm_id !== userId) throw new HttpError(403, 'This work order is assigned to another project manager');
    if (wo.status === 'closed') throw new HttpError(400, `${wo.wo_no} is closed`);
    const worker = await client.query('SELECT 1 FROM project_workers WHERE project_id = $1 AND worker_id = $2', [projectId, workerId]);
    if (worker.rows.length === 0) throw new HttpError(400, 'That worker is not assigned to this project');

    const available = await availableFor(client, projectId, companyId);
    const lines = body.items.map((item, n) => {
      let row = available.find((a) => a.ejw_inward_item_id === parseInt(item && item.ejw_inward_item_id, 10));
      if (!row && item && !item.ejw_inward_item_id && text(item.material_name)) {
        // older screens name the material instead of giving the item: accept it when it is unambiguous
        const named = available.filter((a) => a.material_name.toLowerCase() === text(item.material_name).toLowerCase());
        if (named.length === 1) [row] = named;
      }
      if (!row) throw new HttpError(400, `Item ${n + 1}: it is not available on ${wo.wo_no} (not on this work order, no stock item yet, or all of it is already issued)`);
      const qty = text(item.requested_quantity);
      if (!E.QTY_RE.test(qty) || Number(qty) <= 0) throw new HttpError(400, `${row.material_name}: quantity must be a positive number (up to 3 decimals)`);
      if (Number(qty) > Number(row.available_quantity)) {
        throw new HttpError(400, `${row.material_name}: only ${Number(row.available_quantity)} ${row.unit} is available, you asked for ${Number(qty)}`);
      }
      return { row, qty };
    });
    if (new Set(lines.map((l) => l.row.ejw_inward_item_id)).size !== lines.length) throw new HttpError(400, 'The same item is listed twice');

    const request = (await client.query(
      `INSERT INTO external_jobwork_outstock_requests (project_id, worker_id, requested_by, company_id, request_notes, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id`,
      [projectId, workerId, userId, companyId, text(body.request_notes) || null]
    )).rows[0];
    for (const l of lines) {
      await client.query(
        `INSERT INTO external_jobwork_outstock_request_items (request_id, material_name, requested_quantity, unit, available_quantity, ejw_inward_item_id)
         VALUES ($1, $2, $3::numeric, $4, $5, $6)`,
        [request.id, l.row.material_name, l.qty, l.row.unit, l.row.available_quantity, l.row.ejw_inward_item_id]
      );
    }
    await notifyRole(client, companyId, 'store_incharge', 'New External Job Work Material Request',
      `Material request #${request.id} for ${wo.wo_no}: ${lines.map((l) => `${Number(l.qty)} ${l.row.unit} ${l.row.material_name}`).join(', ')}.`,
      'material_request', projectId, { request_id: request.id, wo_id: wo.id });
    return request.id;
  });
  E.send(res, role, { requestId, status: 'success', message: 'Request created successfully' }, 201);
}));

// ---------- reading requests ----------

router.get('/requests/pending', requireRole('store_incharge', 'management', 'accountant'), wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT r.id, r.project_id, r.worker_id, r.requested_by, r.request_date, r.request_notes, r.status,
            p.name AS project_name, w.name AS worker_name, pm.name AS requested_by_name, wo.wo_no
       FROM external_jobwork_outstock_requests r
       JOIN projects p ON p.id = r.project_id
       JOIN users w ON w.id = r.worker_id
       JOIN users pm ON pm.id = r.requested_by
       LEFT JOIN work_orders wo ON wo.project_id = r.project_id
      WHERE r.company_id = $1 AND r.status IN ('pending', 'fulfilled')
      ORDER BY r.request_date DESC`,
    [req.user.company_id]
  );
  const requests = [];
  for (const r of rows) requests.push({ ...r, items: (await loadRequest(pool, r.id, req.user.company_id)).items });
  E.send(res, req.user.role, { requests });
}));

router.get('/requests/:requestId(\\d+)', requireRole('store_incharge', 'project_manager', 'management', 'accountant', 'worker'), wrap(async (req, res) => {
  const request = await loadRequest(pool, parseInt(req.params.requestId, 10), req.user.company_id);
  if (!request) throw new HttpError(404, 'Request not found');
  const role = normRole(req.user.role);
  if (role === 'project_manager' && request.requested_by !== req.user.id) throw new HttpError(403, 'This is another project manager\'s request');
  if (role === 'worker' && request.worker_id !== req.user.id) throw new HttpError(403, 'This request is for another worker');
  E.send(res, req.user.role, { request });
}));

// ---------- the one deduction path ----------

async function issueRequest(client, requestId, companyId, { issuedBy, mode, notes, qrStatus }) {
  const reqRow = (await client.query(
    'SELECT * FROM external_jobwork_outstock_requests WHERE id = $1 AND company_id = $2 FOR UPDATE', [requestId, companyId]
  )).rows[0];
  if (!reqRow) throw new HttpError(404, 'Request not found');
  if (reqRow.status !== 'pending') throw new HttpError(409, `This request is already ${reqRow.status}`);

  const items = (await client.query('SELECT * FROM external_jobwork_outstock_request_items WHERE request_id = $1 ORDER BY id', [requestId])).rows;
  if (items.length === 0 || items.some((i) => !i.ejw_inward_item_id)) {
    throw new HttpError(400, 'This request was raised under the old stock records and cannot be issued. Ask the project manager to raise it again.');
  }

  // lock the stock rows in a fixed order so two requests cannot deadlock or both take the last units
  const locked = (await client.query(
    `SELECT it.id, it.description, it.unit, it.qty, it.issued_qty, it.short_closed_qty, it.wo_id, w.project_id, w.status AS wo_status
       FROM ejw_inward_items it JOIN work_orders w ON w.id = it.wo_id
      WHERE it.id = ANY($1) ORDER BY it.id FOR UPDATE OF it`,
    [items.map((i) => i.ejw_inward_item_id)]
  )).rows;
  const byId = new Map(locked.map((l) => [l.id, l]));

  for (const item of items) {
    const stock = byId.get(item.ejw_inward_item_id);
    if (!stock || stock.project_id !== reqRow.project_id) throw new HttpError(400, `"${item.material_name}" is no longer on this project's work order`);
    if (stock.wo_status === 'closed') throw new HttpError(400, 'The work order is closed');
    const available = Math.max(0, Number(stock.qty) - Number(stock.issued_qty) - Number(stock.short_closed_qty));
    if (Number(item.requested_quantity) > available) {
      throw new HttpError(400, `Insufficient stock for ${stock.description}: ${Number(item.requested_quantity)} ${stock.unit} requested, ${available} available. Nothing was issued (no partial issue).`);
    }
  }

  const tx = (await client.query(
    `INSERT INTO external_jobwork_outstock_transactions
       (request_id, project_id, worker_id, issued_by, company_id, qr_verification_status, qr_scan_time, transaction_notes)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7) RETURNING id`,
    [requestId, reqRow.project_id, reqRow.worker_id, issuedBy, companyId, qrStatus || 'verified', notes || null]
  )).rows[0];
  for (const item of items) {
    await client.query('UPDATE ejw_inward_items SET issued_qty = issued_qty + $2::numeric WHERE id = $1', [item.ejw_inward_item_id, item.requested_quantity]);
    await client.query(
      `INSERT INTO external_jobwork_outstock_transaction_items (transaction_id, material_name, issued_quantity, unit, ejw_inward_item_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [tx.id, item.material_name, item.requested_quantity, item.unit, item.ejw_inward_item_id]
    );
  }
  await client.query("UPDATE external_jobwork_outstock_requests SET status = 'fulfilled', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [requestId]);

  let collectionId = null;
  if (mode === 'worker') {
    collectionId = (await client.query(
      "INSERT INTO external_material_collections (request_id, collected_by, collection_timestamp, status) VALUES ($1, $2, CURRENT_TIMESTAMP, 'completed') RETURNING id",
      [requestId, issuedBy]
    )).rows[0].id;
  }
  await recomputeWorkOrder(client, locked[0].wo_id, issuedBy);

  const worker = (await client.query('SELECT name FROM users WHERE id = $1', [reqRow.worker_id])).rows[0];
  const what = items.map((i) => `${Number(i.requested_quantity)} ${i.unit} of ${i.material_name}`).join(', ');
  await notifyUser(client, reqRow.requested_by, 'Material Collected',
    `Material collected by ${worker ? worker.name : 'the worker'}. Items: ${what}.`,
    'material_collected', reqRow.project_id, { transaction_id: tx.id, request_id: requestId, worker_id: reqRow.worker_id });
  if (mode === 'worker') {
    await notifyRole(client, companyId, 'store_incharge', 'External Material Collected',
      `Materials collected from request #${requestId} by ${worker ? worker.name : 'the worker'}.`,
      'material_collected', reqRow.project_id, { transaction_id: tx.id, request_id: requestId });
  }
  return { transactionId: tx.id, collectionId };
}

// Store hands the material over
router.post('/requests/:requestId(\\d+)/fulfill', requireRole('store_incharge'), wrap(async (req, res) => {
  const body = req.body || {};
  const out = await withTransaction((client) => issueRequest(client, parseInt(req.params.requestId, 10), req.user.company_id, {
    issuedBy: req.user.id, mode: 'store', notes: text(body.transaction_notes) || null, qrStatus: text(body.qr_verification_status) || 'verified'
  }));
  res.status(201).json({ transactionId: out.transactionId, status: 'success', message: 'Request fulfilled successfully' });
}));

// The worker scans the QR and collects it himself. Same path, same checks.
router.post('/requests/:requestId/collect', requireRole('worker'), wrap(async (req, res) => {
  const raw = String(req.params.requestId).replace(/^REQ-/, '');
  const requestId = parseInt(raw, 10);
  if (!Number.isInteger(requestId)) throw new HttpError(400, 'Invalid request ID format');
  const collectedBy = req.body && req.body.collected_by;
  if (collectedBy !== undefined && parseInt(collectedBy, 10) !== req.user.id) throw new HttpError(403, 'Access denied: Worker mismatch');
  const out = await withTransaction(async (client) => {
    const r = (await client.query('SELECT worker_id FROM external_jobwork_outstock_requests WHERE id = $1 AND company_id = $2', [requestId, req.user.company_id])).rows[0];
    if (!r) throw new HttpError(404, 'Request not found');
    if (r.worker_id !== req.user.id) throw new HttpError(403, 'Access denied: Worker mismatch');
    return issueRequest(client, requestId, req.user.company_id, { issuedBy: req.user.id, mode: 'worker', qrStatus: 'verified', notes: `Collected on ${new Date().toLocaleString()}` });
  });
  res.json({ status: 'success', message: 'Materials collected successfully', collectionId: out.collectionId, transactionId: out.transactionId });
}));

// ---------- cancel (nothing has been issued yet) ----------

router.put('/requests/:requestId(\\d+)/cancel', requireRole('project_manager', 'store_incharge'), wrap(async (req, res) => {
  const requestId = parseInt(req.params.requestId, 10);
  await withTransaction(async (client) => {
    const r = (await client.query('SELECT * FROM external_jobwork_outstock_requests WHERE id = $1 AND company_id = $2 FOR UPDATE', [requestId, req.user.company_id])).rows[0];
    if (!r) throw new HttpError(404, 'Request not found');
    if (normRole(req.user.role) === 'project_manager' && r.requested_by !== req.user.id) throw new HttpError(403, 'This is another project manager\'s request');
    if (r.status !== 'pending') throw new HttpError(400, `Only a pending request can be cancelled (this one is ${r.status})`);
    await client.query("UPDATE external_jobwork_outstock_requests SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [requestId]);
  });
  res.json({ status: 'success', message: 'Request cancelled' });
}));

module.exports = router;
