// Internal Job Work v2 - stock item requests (Phase 4).
// Mounted at /api/jobwork-dcs (before the DC router), so paths are
//   /stock-item-requests...  and  /stock-items/request (kept as an alias).
//
// Store or a PM asks for a stock item, and the product being developed that goes out for job work is
// listed here automatically (source 'product'). Only an accountant creates / links / rejects.
// Notifications carry { request_id, ... } in notifications.data.

const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const {
  HttpError,
  wrap,
  normRole,
  requireRole,
  withTransaction,
  notifyUser,
  notifyRole
} = require('../utils/jobwork');

const router = express.Router();

const text = (v) => (v === undefined || v === null ? '' : String(v).trim());
const STATUSES = ['pending', 'created', 'linked', 'rejected'];

// Everything the accountant needs to decide, captured at request time so it survives later edits.
async function buildContext(client, user, body) {
  const ctx = { requested_at: new Date().toISOString() };
  const who = await client.query('SELECT name FROM users WHERE id = $1', [user.id]);
  ctx.requester_name = who.rows.length ? who.rows[0].name : null;
  let projectId = null;
  let jobWorkItemId = null;
  let dcId = null;
  let ejwInwardItemId = null;

  // customer material being inwarded: what the accountant needs to see to create the stock item
  if (body.ejw_inward_item_id) {
    const { rows } = await client.query(
      `SELECT it.id, it.description, it.hsn, it.qty, it.unit, i.inward_no, i.customer_dc_no, i.customer_dc_date, i.third_party,
              i.supplier_name, i.supplier_dc_no, c.name AS customer_name
         FROM ejw_inward_items it
         JOIN ejw_inwards i ON i.id = it.inward_id
         JOIN master_customers c ON c.id = i.customer_id
        WHERE it.id = $1 AND i.company_id = $2`,
      [parseInt(body.ejw_inward_item_id, 10), user.company_id]
    );
    if (rows.length === 0) throw new HttpError(404, 'Inward item not found');
    const it = rows[0];
    ejwInwardItemId = it.id;
    Object.assign(ctx, {
      kind: 'customer_material', customer_name: it.customer_name, inward_no: it.inward_no,
      customer_dc_no: it.customer_dc_no, customer_dc_date: it.customer_dc_date,
      item_description: it.description, quantity: it.qty, unit: it.unit, hsn_declared: it.hsn
    });
    if (it.third_party) Object.assign(ctx, { supplier_name: it.supplier_name, supplier_dc_no: it.supplier_dc_no });
  }

  if (body.job_work_item_id) {
    const itemId = parseInt(body.job_work_item_id, 10);
    const { rows } = await client.query(
      `SELECT jwi.id, jwi.material_name, jwi.quantity, jwi.unit, jwi.item_code, jwr.job_id, jwr.job_work_type, jwr.purpose,
              jwr.loaded_vehicle_weight, jwr.unloaded_vehicle_weight, jwr.actual_vehicle_weight,
              jwr.project_id, p.name AS project_name, p.po_number
         FROM job_work_items jwi
         JOIN job_work_requests jwr ON jwr.id = jwi.job_work_id
         LEFT JOIN projects p ON p.id = jwr.project_id
        WHERE jwi.id = $1 AND jwr.company_id = $2`,
      [itemId, user.company_id]
    );
    if (rows.length === 0) throw new HttpError(404, 'Job work item not found');
    const r = rows[0];
    jobWorkItemId = r.id;
    projectId = r.project_id;
    if (r.item_code) ctx.drawing_no = r.item_code;
    Object.assign(ctx, {
      project_name: r.project_name, customer_po_no: r.po_number, item_description: r.material_name,
      job_id: r.job_id, process: r.job_work_type === 'Others' ? r.purpose || 'Others' : r.job_work_type,
      quantity: r.quantity, unit: r.unit,
      weights: { loaded: r.loaded_vehicle_weight, unloaded: r.unloaded_vehicle_weight, actual: r.actual_vehicle_weight }
    });
  } else if (body.project_id) {
    const { rows } = await client.query(
      'SELECT id, name, po_number FROM projects WHERE id = $1 AND company_id = $2',
      [parseInt(body.project_id, 10), user.company_id]
    );
    if (rows.length === 0) throw new HttpError(404, 'Project not found');
    projectId = rows[0].id;
    Object.assign(ctx, {
      project_name: rows[0].name, customer_po_no: rows[0].po_number,
      item_description: text(body.item_description) || text(body.name), process: text(body.process) || null
    });
  }

  if (body.dc_id) {
    const { rows } = await client.query(
      'SELECT id, dc_number FROM jobwork_dcs WHERE id = $1 AND company_id = $2',
      [parseInt(body.dc_id, 10), user.company_id]
    );
    if (rows.length === 0) throw new HttpError(404, 'Delivery challan not found');
    dcId = rows[0].id;
    ctx.dc_number = rows[0].dc_number;
  }
  if (text(body.drawing_no)) ctx.drawing_no = text(body.drawing_no);
  return { ctx, projectId, jobWorkItemId, dcId, ejwInwardItemId };
}

// source: 'stock' (someone asked for a stock item) or 'product' (the product being developed, listed
// automatically when the PM sends it for job work). soft: return null instead of throwing when the
// name already exists as a stock item or is already pending (used for the automatic 'product' entries).
async function createRequest(client, user, body, { source = 'stock', soft = false } = {}) {
  const name = text(body.name);
  if (!name) throw new HttpError(400, 'name is required');
  if (name.length > 255) throw new HttpError(400, 'name is too long');

  const existing = await client.query(
    'SELECT id, name FROM stock_items WHERE company_id = $1 AND LOWER(name) = LOWER($2)',
    [user.company_id, name]
  );
  if (existing.rows.length) {
    if (soft) return null;
    throw new HttpError(409, `A stock item named "${existing.rows[0].name}" already exists: pick it from the list instead of requesting it`);
  }
  const dup = await client.query(
    `SELECT r.id, r.created_at, u.name AS requester_name
       FROM stock_item_requests r LEFT JOIN users u ON u.id = r.requested_by
      WHERE r.company_id = $1 AND LOWER(r.requested_name) = LOWER($2) AND r.status = 'pending'`,
    [user.company_id, name]
  );
  if (dup.rows.length) {
    if (soft) return null;
    const d = dup.rows[0];
    throw new HttpError(409, `"${name}" has already been requested${d.requester_name ? ` by ${d.requester_name}` : ''} and is waiting for the accountant (request #${d.id}). It will be filled in on your item once it is created.`);
  }

  const { ctx, projectId, jobWorkItemId, dcId, ejwInwardItemId } = await buildContext(client, user, body);
  ctx.source = source;
  const { rows } = await client.query(
    `INSERT INTO stock_item_requests
       (company_id, requested_name, requested_hsn, requested_unit, note, requested_by, requester_role,
        job_work_item_id, dc_id, project_id, context, source, ejw_inward_item_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13) RETURNING *`,
    [user.company_id, name, text(body.hsn) || null, text(body.unit) || null, text(body.note) || null, user.id,
      normRole(user.role), jobWorkItemId, dcId, projectId, JSON.stringify(ctx), source, ejwInwardItemId]
  );
  const request = rows[0];
  const where = ctx.customer_name
    ? ` for ${ctx.customer_name}'s material (${ctx.inward_no}${ctx.customer_dc_no ? `, customer DC ${ctx.customer_dc_no}` : ''})`
    : ctx.project_name ? ` (project ${ctx.project_name})` : '';
  await notifyRole(client, user.company_id, 'accountant',
    source === 'product' ? 'Product To Add To Stock' : 'Stock Item Requested',
    source === 'product'
      ? `"${name}"${where} is being sent for job work and needs to be added to stock.`
      : `${ctx.requester_name || 'A user'} needs a stock item: "${name}"${where}.`,
    'jobwork_stock_item_request', projectId,
    { request_id: request.id, source, dc_id: dcId, job_work_item_id: jobWorkItemId, project_id: projectId, ejw_inward_item_id: ejwInwardItemId });
  return request;
}

// Existing stock items with a similar name, best match first. Word overlap + substring match.
function similarItems(requestedName, stockItems) {
  const tokens = (s) => String(s).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
  const want = tokens(requestedName);
  const wantLower = String(requestedName).toLowerCase();
  return stockItems
    .map((s) => {
      const have = tokens(s.name);
      const shared = want.filter((w) => have.includes(w)).length;
      const sub = s.name.toLowerCase().includes(wantLower) || wantLower.includes(s.name.toLowerCase()) ? 2 : 0;
      return { ...s, score: shared + sub };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ score, ...s }) => s);
}

async function getRequest(db, id, companyId) {
  const { rows } = await db.query(
    `SELECT r.*, u.name AS requester_name, si.name AS stock_item_name, ru.name AS resolved_by_name
       FROM stock_item_requests r
       LEFT JOIN users u ON u.id = r.requested_by
       LEFT JOIN users ru ON ru.id = r.resolved_by
       LEFT JOIN stock_items si ON si.id = r.stock_item_id
      WHERE r.id = $1 AND r.company_id = $2`,
    [id, companyId]
  );
  return rows[0] || null;
}

router.post(['/stock-item-requests', '/stock-items/request'], authenticateToken,
  requireRole('store_incharge', 'project_manager'), wrap(async (req, res) => {
    const request = await withTransaction((client) => createRequest(client, req.user, req.body || {}));
    res.status(201).json({ request });
  }));

router.get('/stock-item-requests/pending-count', authenticateToken, requireRole('accountant'), wrap(async (req, res) => {
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS count FROM stock_item_requests WHERE company_id = $1 AND status = 'pending'",
    [req.user.company_id]
  );
  res.json({ count: rows[0].count });
}));

router.get('/stock-item-requests', authenticateToken, requireRole('accountant', 'store_incharge', 'project_manager'), wrap(async (req, res) => {
  const where = ['r.company_id = $1'];
  const values = [req.user.company_id];
  if (req.query.status) {
    if (!STATUSES.includes(req.query.status)) throw new HttpError(400, 'Unknown status');
    values.push(req.query.status);
    where.push(`r.status = $${values.length}`);
  }
  if (req.query.source) {
    if (!['stock', 'product'].includes(req.query.source)) throw new HttpError(400, 'Unknown source');
    values.push(req.query.source);
    where.push(`r.source = $${values.length}`);
  }
  // Accountants (and admin / management reading) see everyone's; Store and PM see their own.
  if (!['accountant', 'admin', 'management'].includes(normRole(req.user.role))) {
    values.push(req.user.id);
    where.push(`r.requested_by = $${values.length}`);
  }
  const { rows } = await pool.query(
    `SELECT r.*, u.name AS requester_name, si.name AS stock_item_name, ec.name AS customer_name, ei.customer_dc_no
       FROM stock_item_requests r
       LEFT JOIN users u ON u.id = r.requested_by
       LEFT JOIN stock_items si ON si.id = r.stock_item_id
       LEFT JOIN ejw_inward_items eit ON eit.id = r.ejw_inward_item_id
       LEFT JOIN ejw_inwards ei ON ei.id = eit.inward_id
       LEFT JOIN master_customers ec ON ec.id = ei.customer_id
      WHERE ${where.join(' AND ')}
      ORDER BY (r.status = 'pending') DESC, r.created_at DESC LIMIT 200`,
    values
  );
  res.json({ requests: rows });
}));

router.get('/stock-item-requests/:id(\\d+)', authenticateToken, requireRole('accountant', 'store_incharge', 'project_manager'), wrap(async (req, res) => {
  const request = await getRequest(pool, parseInt(req.params.id, 10), req.user.company_id);
  if (!request) throw new HttpError(404, 'Request not found');
  const isOwner = request.requested_by === req.user.id;
  if (!isOwner && !['accountant', 'admin', 'management'].includes(normRole(req.user.role))) {
    throw new HttpError(403, 'You can only see your own requests');
  }
  const stock = await pool.query('SELECT id, name, hsn, unit FROM stock_items WHERE company_id = $1 ORDER BY name LIMIT 1000', [req.user.company_id]);
  res.json({ request, similar_items: similarItems(request.requested_name, stock.rows) });
}));

// ---- resolve: accountant only, only while pending ----

async function lockPending(client, id, companyId) {
  const { rows } = await client.query(
    'SELECT * FROM stock_item_requests WHERE id = $1 AND company_id = $2 FOR UPDATE',
    [id, companyId]
  );
  if (rows.length === 0) throw new HttpError(404, 'Request not found');
  if (rows[0].status !== 'pending') {
    throw new HttpError(400, `This request is already ${rows[0].status}; only a pending request can be resolved`);
  }
  return rows[0];
}

// Fill the stock item on the request's own job work item and on any other not-yet-planned item
// with the same name that is still missing one (e.g. a second PM who hit the duplicate block).
async function autofill(client, request, stockItemId, companyId) {
  const { rowCount } = await client.query(
    `UPDATE job_work_items jwi SET stock_item_id = $1
       FROM job_work_requests jwr
      WHERE jwr.id = jwi.job_work_id AND jwr.company_id = $2 AND jwi.stock_item_id IS NULL
        AND (jwi.id = $3 OR LOWER(TRIM(jwi.material_name)) = LOWER(TRIM($4)))`,
    [stockItemId, companyId, request.job_work_item_id, request.requested_name]
  );
  const inwardFilled = await client.query(
    `UPDATE ejw_inward_items it
        SET stock_item_id = $1, hsn = COALESCE(NULLIF(BTRIM(it.hsn), ''), (SELECT hsn FROM stock_items WHERE id = $1))
       FROM ejw_inwards i
      WHERE i.id = it.inward_id AND i.company_id = $2 AND it.stock_item_id IS NULL
        AND (it.id = $3 OR LOWER(TRIM(it.description)) = LOWER(TRIM($4)))`,
    [stockItemId, companyId, request.ejw_inward_item_id, request.requested_name]
  );
  return rowCount + inwardFilled.rowCount;
}

async function finish(client, request, status, user, extra) {
  await client.query(
    `UPDATE stock_item_requests
        SET status = $2, stock_item_id = $3, reason = $4, resolved_by = $5, resolved_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $1`,
    [request.id, status, extra.stock_item_id || null, extra.reason || null, user.id]
  );
  await notifyUser(client, request.requested_by,
    status === 'rejected' ? 'Stock Item Request Rejected' : 'Stock Item Ready',
    extra.message, 'jobwork_stock_item_resolved', request.project_id,
    { request_id: request.id, status, stock_item_id: extra.stock_item_id || null,
      job_work_item_id: request.job_work_item_id, dc_id: request.dc_id, ejw_inward_item_id: request.ejw_inward_item_id });
  return getRequest(client, request.id, user.company_id);
}

router.post('/stock-item-requests/:id(\\d+)/link', authenticateToken, requireRole('accountant'), wrap(async (req, res) => {
  const stockItemId = parseInt(req.body && req.body.stock_item_id, 10);
  if (!Number.isInteger(stockItemId) || stockItemId <= 0) throw new HttpError(400, 'stock_item_id is required');
  const out = await withTransaction(async (client) => {
    const request = await lockPending(client, parseInt(req.params.id, 10), req.user.company_id);
    const si = await client.query('SELECT id, name FROM stock_items WHERE id = $1 AND company_id = $2', [stockItemId, req.user.company_id]);
    if (si.rows.length === 0) throw new HttpError(404, 'Stock item not found');
    const filled = await autofill(client, request, si.rows[0].id, req.user.company_id);
    const done = await finish(client, request, 'linked', req.user, {
      stock_item_id: si.rows[0].id,
      message: `"${request.requested_name}" is linked to the existing stock item "${si.rows[0].name}". It has been filled in on your item.`
    });
    return { request: done, autofilled_items: filled };
  });
  res.json(out);
}));

router.post('/stock-item-requests/:id(\\d+)/create', authenticateToken, requireRole('accountant'), wrap(async (req, res) => {
  const body = req.body || {};
  const out = await withTransaction(async (client) => {
    const request = await lockPending(client, parseInt(req.params.id, 10), req.user.company_id);
    const name = text(body.name) || request.requested_name;
    const unit = text(body.unit) || request.requested_unit;
    if (!unit) throw new HttpError(400, 'unit is required');
    const created = await client.query(
      'INSERT INTO stock_items (company_id, name, hsn, unit, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id, name',
      [req.user.company_id, name, text(body.hsn) || request.requested_hsn || null, unit, req.user.id]
    );
    const filled = await autofill(client, request, created.rows[0].id, req.user.company_id);
    const done = await finish(client, request, 'created', req.user, {
      stock_item_id: created.rows[0].id,
      message: `Stock item "${created.rows[0].name}" has been created. It has been filled in on your item.`
    });
    return { request: done, autofilled_items: filled };
  });
  res.status(201).json(out);
}));

router.post('/stock-item-requests/:id(\\d+)/reject', authenticateToken, requireRole('accountant'), wrap(async (req, res) => {
  const reason = text(req.body && req.body.reason);
  if (!reason) throw new HttpError(400, 'A reason is required');
  const out = await withTransaction(async (client) => {
    const request = await lockPending(client, parseInt(req.params.id, 10), req.user.company_id);
    const done = await finish(client, request, 'rejected', req.user, {
      reason, message: `Your request for "${request.requested_name}" was rejected: ${reason}`
    });
    return { request: done };
  });
  res.json(out);
}));

module.exports = router;
module.exports.similarItems = similarItems;
module.exports.createRequest = createRequest;
