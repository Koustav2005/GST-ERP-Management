// External Job Work v2 - "ready" flow. Mounted at /api/ejw.
//
//   PM claims quantities ready (with the inspection report)  ->  Store counts and confirms (sets ready_qty)
//   ->  Accounts is told that the work order can be dispatched.
// A claim changes nothing in the books; only Store's confirmation moves ready_qty.

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { HttpError, wrap, normRole, requireRole, withTransaction, notifyRole } = require('../utils/jobwork');
const E = require('../utils/ejw');
const { recomputeWorkOrder } = require('../utils/ejwStatus');

const router = express.Router();
router.use(authenticateToken);
const { text } = E;

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
      cb(null, 'uploads');
    },
    filename: (req, file, cb) => cb(null, `ejw-ready-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 20 * 1024 * 1024 }
});

function parseItems(raw) {
  let items = raw;
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch (e) { throw new HttpError(400, 'items must be a list'); }
  }
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'Choose at least one item and the quantity that is ready');
  return items;
}

async function loadNotice(db, id, companyId) {
  const head = (await db.query(
    `SELECT n.*, w.wo_no, w.pm_id, w.project_id, c.name AS customer_name, u.name AS marked_by_name
       FROM ejw_ready_notices n JOIN work_orders w ON w.id = n.wo_id
       JOIN master_customers c ON c.id = w.customer_id LEFT JOIN users u ON u.id = n.marked_by
      WHERE n.id = $1 AND n.company_id = $2`, [id, companyId])).rows[0];
  if (!head) return null;
  const items = (await db.query(
    `SELECT ni.id, ni.inward_item_id, ni.claimed_qty, ni.confirmed_qty, it.description, it.hsn, it.unit, it.qty,
            it.issued_qty, it.ready_qty, it.total_value AS component_value, i.inward_no, i.customer_dc_no
       FROM ejw_ready_notice_items ni JOIN ejw_inward_items it ON it.id = ni.inward_item_id
       JOIN ejw_inwards i ON i.id = it.inward_id WHERE ni.notice_id = $1 ORDER BY ni.id`, [id])).rows;
  return { ...head, items };
}

// ---------- PM: claim ready ----------

router.post('/work-orders/:id(\\d+)/mark-ready', requireRole('project_manager'), upload.single('inspection_report'), wrap(async (req, res) => {
  const woId = parseInt(req.params.id, 10);
  const items = parseItems(req.body && req.body.items);
  const noticeId = await withTransaction(async (client) => {
    const wo = (await client.query('SELECT * FROM work_orders WHERE id = $1 AND company_id = $2 FOR UPDATE', [woId, req.user.company_id])).rows[0];
    if (!wo) throw new HttpError(404, 'Work order not found');
    if (wo.pm_id !== req.user.id) throw new HttpError(403, 'This work order is assigned to another project manager');
    if (wo.status === 'closed') throw new HttpError(400, `${wo.wo_no} is closed`);

    const report = await client.query("SELECT 1 FROM work_order_documents WHERE wo_id = $1 AND kind = 'inspection_report'", [woId]);
    if (!req.file && report.rowCount === 0) throw new HttpError(400, 'Attach the inspection report before marking material ready');

    const pending = (await client.query("SELECT 1 FROM ejw_ready_notices WHERE wo_id = $1 AND status = 'pending'", [woId])).rowCount;
    if (pending) throw new HttpError(409, 'Store has not yet confirmed the earlier ready notice for this work order');

    const ids = items.map((i) => parseInt(i && i.inward_item_id, 10));
    if (ids.some((n) => !Number.isInteger(n)) || new Set(ids).size !== ids.length) throw new HttpError(400, 'Each item must be listed once, with inward_item_id');
    const stock = (await client.query('SELECT * FROM ejw_inward_items WHERE id = ANY($1) AND wo_id = $2 ORDER BY id FOR UPDATE', [ids, woId])).rows;
    const byId = new Map(stock.map((s) => [s.id, s]));
    const lines = items.map((item, n) => {
      const s = byId.get(ids[n]);
      if (!s) throw new HttpError(400, `Item ${n + 1} is not on ${wo.wo_no}`);
      const qty = text(item.qty);
      if (!E.QTY_RE.test(qty) || Number(qty) <= 0) throw new HttpError(400, `${s.description}: quantity must be a positive number (up to 3 decimals)`);
      const room = Number(s.issued_qty) - Number(s.ready_qty);
      if (Number(qty) > room) throw new HttpError(400, `${s.description}: only ${room} ${s.unit} has been issued to the floor and is not yet ready, you claimed ${Number(qty)}`);
      return { id: s.id, qty };
    });

    const notice = (await client.query(
      `INSERT INTO ejw_ready_notices (company_id, wo_id, status, inspection_report_name, inspection_report_path, note, marked_by)
       VALUES ($1, $2, 'pending', $3, $4, $5, $6) RETURNING id`,
      [req.user.company_id, woId, req.file ? req.file.originalname : null, req.file ? `/uploads/${req.file.filename}` : null, text(req.body.note) || null, req.user.id]
    )).rows[0];
    for (const l of lines) {
      await client.query('INSERT INTO ejw_ready_notice_items (notice_id, inward_item_id, claimed_qty) VALUES ($1, $2, $3::numeric)', [notice.id, l.id, l.qty]);
    }
    if (req.file) {
      await client.query(
        "INSERT INTO work_order_documents (wo_id, kind, file_name, file_path, uploaded_by) VALUES ($1, 'inspection_report', $2, $3, $4)",
        [woId, req.file.originalname, `/uploads/${req.file.filename}`, req.user.id]
      );
    }
    await E.notifyRole(client, req.user.company_id, 'store_incharge', 'Material Ready for Confirmation',
      `${wo.wo_no}: the project manager says material is ready. Please count and confirm.`, 'ejw_ready_claimed', wo.project_id, { notice_id: notice.id, wo_id: woId });
    return notice.id;
  });
  E.send(res, req.user.role, { notice: await loadNotice(pool, noticeId, req.user.company_id) }, 201);
}));

// ---------- reading ----------

router.get('/ready-notices', requireRole('store_incharge', 'project_manager', 'accountant', 'management'), wrap(async (req, res) => {
  const status = text(req.query.status);
  const { rows } = await pool.query(
    `SELECT n.id FROM ejw_ready_notices n JOIN work_orders w ON w.id = n.wo_id
      WHERE n.company_id = $1 AND ($2 = '' OR n.status = $2) AND ($3::int IS NULL OR w.pm_id = $3)
      ORDER BY n.id DESC`,
    [req.user.company_id, status, normRole(req.user.role) === 'project_manager' ? req.user.id : null]
  );
  const notices = [];
  for (const r of rows) notices.push(await loadNotice(pool, r.id, req.user.company_id));
  E.send(res, req.user.role, { notices });
}));

router.get('/ready-notices/:id(\\d+)', requireRole('store_incharge', 'project_manager', 'accountant', 'management'), wrap(async (req, res) => {
  const notice = await loadNotice(pool, parseInt(req.params.id, 10), req.user.company_id);
  if (!notice) throw new HttpError(404, 'Ready notice not found');
  if (normRole(req.user.role) === 'project_manager' && notice.pm_id !== req.user.id) throw new HttpError(403, 'This work order is assigned to another project manager');
  E.send(res, req.user.role, { notice });
}));

// ---------- Store: count and confirm ----------

router.post('/ready-notices/:id(\\d+)/confirm', requireRole('store_incharge'), wrap(async (req, res) => {
  const noticeId = parseInt(req.params.id, 10);
  const given = req.body && req.body.items;
  const woId = await withTransaction(async (client) => {
    const notice = (await client.query('SELECT * FROM ejw_ready_notices WHERE id = $1 AND company_id = $2 FOR UPDATE', [noticeId, req.user.company_id])).rows[0];
    if (!notice) throw new HttpError(404, 'Ready notice not found');
    if (notice.status !== 'pending') throw new HttpError(400, 'This ready notice is already confirmed');
    const lines = (await client.query('SELECT * FROM ejw_ready_notice_items WHERE notice_id = $1 ORDER BY inward_item_id', [noticeId])).rows;
    const counted = new Map();
    if (given !== undefined) {
      if (!Array.isArray(given)) throw new HttpError(400, 'items must be a list');
      for (const g of given) {
        const id = parseInt(g && g.inward_item_id, 10);
        const q = text(g && g.confirmed_qty);
        if (!lines.some((l) => l.inward_item_id === id)) throw new HttpError(400, 'An item you counted is not on this ready notice');
        if (!E.QTY_RE.test(q)) throw new HttpError(400, 'confirmed_qty must be a number (up to 3 decimals), 0 if none is ready');
        counted.set(id, q);
      }
    }
    const stock = (await client.query('SELECT * FROM ejw_inward_items WHERE id = ANY($1) ORDER BY id FOR UPDATE', [lines.map((l) => l.inward_item_id)])).rows;
    const byId = new Map(stock.map((s) => [s.id, s]));
    for (const l of lines) {
      const s = byId.get(l.inward_item_id);
      const q = counted.has(l.inward_item_id) ? counted.get(l.inward_item_id) : String(l.claimed_qty);
      if (Number(q) > Number(l.claimed_qty)) throw new HttpError(400, `${s.description}: you cannot confirm more (${Number(q)}) than the project manager claimed (${Number(l.claimed_qty)})`);
      if (Number(s.ready_qty) + Number(q) > Number(s.issued_qty)) throw new HttpError(400, `${s.description}: ready quantity cannot exceed what was issued to the floor`);
      await client.query('UPDATE ejw_ready_notice_items SET confirmed_qty = $2::numeric WHERE id = $1', [l.id, q]);
      await client.query('UPDATE ejw_inward_items SET ready_qty = ready_qty + $2::numeric WHERE id = $1', [l.inward_item_id, q]);
    }
    await client.query("UPDATE ejw_ready_notices SET status = 'confirmed', confirmed_by = $2, confirmed_at = CURRENT_TIMESTAMP WHERE id = $1", [noticeId, req.user.id]);
    const wo = (await client.query('SELECT wo_no, project_id FROM work_orders WHERE id = $1', [notice.wo_id])).rows[0];
    await recomputeWorkOrder(client, notice.wo_id, req.user.id);
    await E.notifyRole(client, req.user.company_id, 'accountant', 'Ready for Dispatch',
      `${wo.wo_no} has material confirmed ready by Store. It can now be dispatched.`, 'ejw_ready_confirmed', wo.project_id, { notice_id: noticeId, wo_id: notice.wo_id });
    return notice.wo_id;
  });
  E.send(res, req.user.role, { work_order_id: woId, notice: await loadNotice(pool, noticeId, req.user.company_id) });
}));

module.exports = router;
