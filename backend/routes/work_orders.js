// External Job Work v2 - work orders (SE/WO) and the "External stock awaiting work" list.
// Mounted at /api/ejw  (this file: /work-orders..., /stock-awaiting-work).
//
//  S1/S2  a PM picks inward items of ONE customer and creates a work order; that creates the project
//         (project_type external_job_work) so workers, reports and material requests keep working.
//  S3     the work order is created together with the project at PO upload (routes/enquiries.js), in status
//         awaiting_material and with no PM yet; Store inwards material against it.
// The PM never sees money; Store never sees invoice amounts (utils/ejw.js shapes every response).

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { HttpError, wrap, normRole, requireRole, withTransaction, notifyRole } = require('../utils/jobwork');
const E = require('../utils/ejw');

const router = express.Router();
router.use(authenticateToken);

const { text } = E;
const DOC_KINDS = ['drawing', 'quotation', 'inspection_report', 'customer_po', 'other'];
const ALL_READERS = ['project_manager', 'npd', 'store_incharge', 'accountant', 'management'];

// A PM works only on work orders assigned to them; NPD, Store, Accounts and Management can look at all.
function assertCanRead(user, wo) {
  if (normRole(user.role) === 'project_manager' && wo.pm_id !== user.id) throw new HttpError(403, 'This work order is assigned to another project manager');
}
function assertCanEdit(user, wo) {
  const role = normRole(user.role);
  if (role === 'project_manager' && wo.pm_id !== user.id) throw new HttpError(403, 'This work order is assigned to another project manager');
  if (wo.status === 'closed') throw new HttpError(400, `${wo.wo_no} is closed`);
}

async function loadWorkOrder(db, id, companyId) {
  const head = await db.query(
    `SELECT w.*, c.name AS customer_name, c.gstin AS customer_gstin, c.state AS customer_state,
            p.name AS project_name, p.status AS project_status, p.po_number AS project_po_no, u.name AS pm_name, e.enquiry_number
       FROM work_orders w
       JOIN master_customers c ON c.id = w.customer_id
       LEFT JOIN projects p ON p.id = w.project_id
       LEFT JOIN users u ON u.id = w.pm_id
       LEFT JOIN enquiries e ON e.id = w.enquiry_id
      WHERE w.id = $1 AND w.company_id = $2`,
    [id, companyId]
  );
  if (head.rows.length === 0) return null;
  const wo = head.rows[0];
  const items = await db.query(
    `SELECT it.id, it.inward_id, i.inward_no, i.customer_dc_no, i.customer_dc_date, i.third_party,
            (NULLIF(BTRIM(i.customer_dc_no), '') IS NULL) AS customer_dc_pending, r.received_date,
            it.stock_item_id, st.name AS stock_item_name, it.description, it.hsn, it.qty, it.unit, it.unit_value, it.total_value,
            it.issued_qty, it.ready_qty, it.returned_qty, it.short_closed_qty,
            (it.qty - it.returned_qty - it.short_closed_qty) AS pending_qty
       FROM ejw_inward_items it
       JOIN ejw_inwards i ON i.id = it.inward_id
       JOIN ejw_inward_receipts r ON r.id = it.receipt_id
       LEFT JOIN stock_items st ON st.id = it.stock_item_id
      WHERE it.wo_id = $1 ORDER BY it.id`,
    [id]
  );
  const documents = await db.query('SELECT * FROM work_order_documents WHERE wo_id = $1 ORDER BY id', [id]);
  const history = wo.project_id
    ? await db.query('SELECT old_status, new_status, notes, changed_at FROM project_status_history WHERE project_id = $1 ORDER BY id', [wo.project_id])
    : { rows: [] };
  return { ...wo, items: items.rows, documents: documents.rows, history: history.rows };
}

// ---------- stock awaiting work ----------

// Inward items not on any work order yet, grouped by customer. Any PM can see these and make a work order.
router.get('/stock-awaiting-work', requireRole('project_manager', 'store_incharge', 'accountant', 'management'), wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.id AS customer_id, c.name AS customer_name,
            i.id AS inward_id, i.inward_no, i.customer_dc_no, i.customer_dc_date, i.third_party, i.supplier_name,
            (NULLIF(BTRIM(i.customer_dc_no), '') IS NULL) AS customer_dc_pending,
            it.id AS item_id, st.name AS stock_item_name, (it.stock_item_id IS NULL) AS stock_item_pending, it.description, it.hsn, it.qty, it.unit, it.unit_value, it.total_value,
            r.received_date, (CURRENT_DATE - r.received_date) AS days_held,
            (it.qty - it.returned_qty - it.short_closed_qty) AS pending_qty
       FROM ejw_inward_items it
       JOIN ejw_inwards i ON i.id = it.inward_id
       JOIN master_customers c ON c.id = i.customer_id
       JOIN ejw_inward_receipts r ON r.id = it.receipt_id
       LEFT JOIN stock_items st ON st.id = it.stock_item_id
      WHERE i.company_id = $1 AND it.wo_id IS NULL AND (it.qty - it.returned_qty - it.short_closed_qty) > 0
      ORDER BY LOWER(c.name), i.id, it.id`,
    [req.user.company_id]
  );
  const customers = new Map();
  for (const r of rows) {
    if (!customers.has(r.customer_id)) customers.set(r.customer_id, { customer_id: r.customer_id, customer_name: r.customer_name, inwards: new Map() });
    const c = customers.get(r.customer_id);
    if (!c.inwards.has(r.inward_id)) {
      c.inwards.set(r.inward_id, {
        inward_id: r.inward_id, inward_no: r.inward_no, customer_dc_no: r.customer_dc_no, customer_dc_date: r.customer_dc_date,
        third_party: r.third_party, supplier_name: r.supplier_name, customer_dc_pending: r.customer_dc_pending, items: []
      });
    }
    c.inwards.get(r.inward_id).items.push({
      item_id: r.item_id, stock_item_name: r.stock_item_name, stock_item_pending: r.stock_item_pending, description: r.description, hsn: r.hsn, qty: r.qty, unit: r.unit,
      unit_value: r.unit_value, total_value: r.total_value, received_date: r.received_date, days_held: r.days_held, pending_qty: r.pending_qty
    });
  }
  const customersOut = [...customers.values()].map((c) => ({ ...c, inwards: [...c.inwards.values()] }));
  E.send(res, req.user.role, { customers: customersOut });
}));

// ---------- create (S1 / S2) ----------

router.post('/work-orders', requireRole('project_manager'), wrap(async (req, res) => {
  const { company_id: companyId, id: userId, role } = req.user;
  const body = req.body || {};
  const ids = Array.isArray(body.inward_item_ids) ? body.inward_item_ids.map((n) => parseInt(n, 10)) : [];
  if (ids.length === 0 || ids.some((n) => !Number.isInteger(n) || n <= 0)) throw new HttpError(400, 'Pick at least one item of customer material');
  if (new Set(ids).size !== ids.length) throw new HttpError(400, 'The same item is listed twice');
  const description = text(body.description) || null;
  if (description && description.length > 2000) throw new HttpError(400, 'description is too long');

  const woId = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT it.id, it.wo_id, it.stock_item_id, it.description, (it.qty - it.returned_qty - it.short_closed_qty) AS pending_qty,
              i.customer_id, i.inward_no, c.name AS customer_name
         FROM ejw_inward_items it
         JOIN ejw_inwards i ON i.id = it.inward_id
         JOIN master_customers c ON c.id = i.customer_id
        WHERE it.id = ANY($1) AND i.company_id = $2 FOR UPDATE OF it`,
      [ids, companyId]
    );
    if (rows.length !== ids.length) throw new HttpError(404, 'Some of those items were not found');
    const customers = new Set(rows.map((r) => r.customer_id));
    if (customers.size > 1) throw new HttpError(400, 'A work order is for one customer: pick items of a single customer');
    const taken = rows.find((r) => r.wo_id);
    if (taken) throw new HttpError(409, `"${taken.description}" (${taken.inward_no}) is already on a work order`);
    const waiting = rows.find((r) => !r.stock_item_id);
    if (waiting) throw new HttpError(400, `"${waiting.description}" is waiting for Accounts to create its stock item`);
    const done = rows.find((r) => Number(r.pending_qty) <= 0);
    if (done) throw new HttpError(400, `"${done.description}" has already gone back to the customer`);

    const wo = await E.createWorkOrder(client, {
      companyId, customerId: rows[0].customer_id, source: 'stock', status: 'open', pmId: userId, createdBy: userId,
      description: description || `${rows[0].customer_name}: ${rows.map((r) => r.description).join(', ')}`.slice(0, 500),
      customerPoNo: text(body.customer_po_no) || null, itemIds: ids
    });
    return wo.id;
  });
  E.send(res, role, { work_order: await loadWorkOrder(pool, woId, companyId) }, 201);
}));

// ---------- add stock to an existing job ----------

// The PM picks customer material and one of his own jobs (the project NPD assigned to him) of the SAME customer.
router.post('/work-orders/:id(\\d+)/add-items', requireRole('project_manager'), wrap(async (req, res) => {
  const { company_id: companyId, id: userId, role } = req.user;
  const woId = parseInt(req.params.id, 10);
  const ids = Array.isArray(req.body && req.body.inward_item_ids) ? req.body.inward_item_ids.map((n) => parseInt(n, 10)) : [];
  if (ids.length === 0 || ids.some((n) => !Number.isInteger(n) || n <= 0)) throw new HttpError(400, 'Pick at least one item of customer material');
  if (new Set(ids).size !== ids.length) throw new HttpError(400, 'The same item is listed twice');

  await withTransaction(async (client) => {
    const wo = (await client.query('SELECT * FROM work_orders WHERE id = $1 AND company_id = $2 FOR UPDATE', [woId, companyId])).rows[0];
    if (!wo) throw new HttpError(404, 'Work order not found');
    assertCanEdit(req.user, wo);
    const { rows } = await client.query(
      `SELECT it.id, it.wo_id, it.stock_item_id, it.description, (it.qty - it.returned_qty - it.short_closed_qty) AS pending_qty,
              i.customer_id, i.inward_no
         FROM ejw_inward_items it JOIN ejw_inwards i ON i.id = it.inward_id
        WHERE it.id = ANY($1) AND i.company_id = $2 FOR UPDATE OF it`, [ids, companyId]);
    if (rows.length !== ids.length) throw new HttpError(404, 'Some of those items were not found');
    const other = rows.find((r) => r.customer_id !== wo.customer_id);
    if (other) throw new HttpError(400, `"${other.description}" (${other.inward_no}) belongs to another customer than ${wo.wo_no}. A job only takes its own customer's material.`);
    const taken = rows.find((r) => r.wo_id);
    if (taken) throw new HttpError(409, `"${taken.description}" (${taken.inward_no}) is already on a work order`);
    const waiting = rows.find((r) => !r.stock_item_id);
    if (waiting) throw new HttpError(400, `"${waiting.description}" is waiting for Accounts to create its stock item`);
    const done = rows.find((r) => Number(r.pending_qty) <= 0);
    if (done) throw new HttpError(400, `"${done.description}" has already gone back to the customer`);

    await client.query('UPDATE ejw_inward_items SET wo_id = $1 WHERE id = ANY($2)', [woId, ids]);
    if (wo.status === 'awaiting_material') {
      await client.query("UPDATE work_orders SET status = 'open', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [woId]);
      await E.logProjectHistory(client, wo.project_id, userId, 'Awaiting material', 'Open', 'Customer material added to the job');
    }
  });
  E.send(res, role, { work_order: await loadWorkOrder(pool, woId, companyId) });
}));

// ---------- read ----------

router.get('/work-orders', requireRole(...ALL_READERS), wrap(async (req, res) => {
  const where = ['w.company_id = $1'];
  const values = [req.user.company_id];
  const add = (sql, v) => { values.push(v); where.push(sql.replace('?', `$${values.length}`)); };
  if (normRole(req.user.role) === 'project_manager') add('w.pm_id = ?', req.user.id);
  if (req.query.status) {
    if (!['awaiting_material', 'open', 'in_process', 'ready', 'partially_dispatched', 'closed'].includes(req.query.status)) throw new HttpError(400, 'Unknown status');
    add('w.status = ?', req.query.status);
  }
  if (req.query.customer_id) add('w.customer_id = ?', E.requireInt(req.query.customer_id, 'customer_id'));
  if (req.query.no_pm === '1') where.push('w.pm_id IS NULL');
  const { rows } = await pool.query(
    `SELECT w.id, w.wo_no, w.status, w.source, w.customer_id, c.name AS customer_name, w.pm_id, u.name AS pm_name, w.project_id,
            w.customer_po_no, w.description, w.created_at,
            (SELECT COUNT(*)::int FROM ejw_inward_items WHERE wo_id = w.id) AS item_count
       FROM work_orders w JOIN master_customers c ON c.id = w.customer_id LEFT JOIN users u ON u.id = w.pm_id
      WHERE ${where.join(' AND ')} ORDER BY w.id DESC LIMIT 300`,
    values
  );
  E.send(res, req.user.role, { work_orders: rows });
}));

router.get('/work-orders/:id(\\d+)', requireRole(...ALL_READERS), wrap(async (req, res) => {
  const wo = await loadWorkOrder(pool, parseInt(req.params.id, 10), req.user.company_id);
  if (!wo) throw new HttpError(404, 'Work order not found');
  assertCanRead(req.user, wo);
  E.send(res, req.user.role, { work_order: wo });
}));

// ---------- PO number, description, expected material ----------

router.put('/work-orders/:id(\\d+)', requireRole('project_manager', 'npd'), wrap(async (req, res) => {
  const body = req.body || {};
  const woId = parseInt(req.params.id, 10);
  const wo = await loadWorkOrder(pool, woId, req.user.company_id);
  if (!wo) throw new HttpError(404, 'Work order not found');
  assertCanEdit(req.user, wo);
  const sets = [];
  const values = [];
  if (body.customer_po_no !== undefined) {
    const po = text(body.customer_po_no);
    if (po.length > 100) throw new HttpError(400, 'customer_po_no is too long');
    values.push(po || null); sets.push(`customer_po_no = $${values.length}`);
  }
  if (body.description !== undefined) {
    const d = text(body.description);
    if (d.length > 2000) throw new HttpError(400, 'description is too long');
    values.push(d || null); sets.push(`description = $${values.length}`);
  }
  if (sets.length === 0) throw new HttpError(400, 'Nothing to update');
  values.push(woId);
  await pool.query(`UPDATE work_orders SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`, values);
  E.send(res, req.user.role, { work_order: await loadWorkOrder(pool, woId, req.user.company_id) });
}));

// The only thing left of "notify material arrival": a note on a job that is waiting for material. Creates nothing.
router.put('/work-orders/:id(\\d+)/expected-material', requireRole('project_manager', 'npd'), wrap(async (req, res) => {
  const woId = parseInt(req.params.id, 10);
  const wo = await loadWorkOrder(pool, woId, req.user.company_id);
  if (!wo) throw new HttpError(404, 'Work order not found');
  assertCanEdit(req.user, wo);
  if (wo.status !== 'awaiting_material') throw new HttpError(400, `${wo.wo_no} is not waiting for material any more`);
  const note = text(req.body && req.body.note);
  if (note.length > 2000) throw new HttpError(400, 'note is too long');
  await pool.query('UPDATE work_orders SET expected_material_note = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [woId, note || null]);
  E.send(res, req.user.role, { work_order: await loadWorkOrder(pool, woId, req.user.company_id) });
}));

// ---------- documents: drawing, quotation, inspection report, customer PO ----------

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
      cb(null, 'uploads');
    },
    filename: (req, file, cb) => cb(null, `ejw-wo-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 20 * 1024 * 1024 }
});

router.post('/work-orders/:id(\\d+)/documents', requireRole('project_manager', 'npd'), upload.single('file'), wrap(async (req, res) => {
  const woId = parseInt(req.params.id, 10);
  try {
    if (!req.file) throw new HttpError(400, 'No file uploaded');
    const kind = text(req.body.kind) || 'other';
    if (!DOC_KINDS.includes(kind)) throw new HttpError(400, `kind must be one of: ${DOC_KINDS.join(', ')}`);
    const wo = await loadWorkOrder(pool, woId, req.user.company_id);
    if (!wo) throw new HttpError(404, 'Work order not found');
    assertCanEdit(req.user, wo);
    await pool.query(
      'INSERT INTO work_order_documents (wo_id, kind, file_name, file_path, note, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6)',
      [woId, kind, req.file.originalname, `/uploads/${req.file.filename}`, text(req.body.note) || null, req.user.id]
    );
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    throw err;
  }
  E.send(res, req.user.role, { work_order: await loadWorkOrder(pool, woId, req.user.company_id) }, 201);
}));

module.exports = router;
module.exports.loadWorkOrder = loadWorkOrder;
