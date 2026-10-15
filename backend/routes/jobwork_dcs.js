// Internal Job Work v2 - delivery challans (Phase 2a: stock items, create/edit, approve/reject).
// Mounted at /api/jobwork-dcs. Spec: .kiro/specs/internal-job-work-v2/requirements.md

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const {
  HttpError,
  wrap,
  stateOf,
  requireRole,
  withTransaction,
  recomputeRequestStatus,
  dcRequestIds,
  dcProjectIds,
  logHistory,
  notifyUser,
  notifyRole
} = require('../utils/jobwork');
const { resolveNumber, assertDcNumberFree } = require('../utils/numbering');

const router = express.Router();
router.use(authenticateToken);

const EWAY_THRESHOLD = 50000; // e-way bill number required when DC total value is above this
const DC_STATUSES = ['dc_created', 'approved', 'rejected', 'dispatched', 'partially_returned', 'closed'];
const MONEY_RE = /^\d+(\.\d{1,2})?$/;

// ---------- small helpers ----------

const text = (v) => (v === undefined || v === null ? '' : String(v).trim());

const EWAY_RE = /^\d{12}$/;

// Does this DC need an e-way bill number? Value above the threshold, or interstate job work
// (vendor and company states come from the GSTIN prefix, falling back to the state text).
// One source of truth for approve() and for what the Accountant screen shows.
async function ewayRequirement(db, dcId) {
  const { rows } = await db.query(
    `SELECT COALESCE(SUM(di.total_value), 0) AS total_value,
            v.gst_number AS vendor_gstin, v.state AS vendor_state_text,
            c.gst_number AS company_gstin, c.state AS company_state_text
       FROM jobwork_dcs d
       LEFT JOIN jobwork_dc_items di ON di.dc_id = d.id
       LEFT JOIN master_vendors v ON v.id = d.vendor_id
       LEFT JOIN companies c ON c.id = d.company_id
      WHERE d.id = $1
      GROUP BY v.gst_number, v.state, c.gst_number, c.state`,
    [dcId]
  );
  const r = rows[0];
  const vendorState = stateOf(r.vendor_gstin, r.vendor_state_text);
  const companyState = stateOf(r.company_gstin, r.company_state_text);
  const reasons = [];
  if (Number(r.total_value) > EWAY_THRESHOLD) {
    reasons.push(`DC value ${r.total_value} is above ${EWAY_THRESHOLD}`);
  }
  if (!vendorState || !companyState) {
    reasons.push(`Interstate status unknown (vendor state: ${vendorState || 'not set'}, our state: ${companyState || 'not set'}); set the GSTIN or state`);
  } else if (vendorState !== companyState) {
    reasons.push(`Interstate job work: vendor is in ${vendorState}, we are in ${companyState}`);
  }
  return { required: reasons.length > 0, reasons, threshold: EWAY_THRESHOLD, total_value: r.total_value, vendor_state: vendorState, company_state: companyState };
}

function optionalNumber(value, label) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new HttpError(400, `${label} must be a non-negative number`);
  return n;
}

function requireId(value, label) {
  const n = parseInt(value, 10);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `${label} is required`);
  return n;
}

async function getVendorSnapshot(client, vendorId, companyId) {
  const { rows } = await client.query(
    `SELECT id, name, gst_number, address, state, pincode
       FROM master_vendors WHERE id = $1 AND company_id = $2`,
    [vendorId, companyId]
  );
  if (rows.length === 0) throw new HttpError(404, 'Vendor not found');
  const v = rows[0];
  return {
    id: v.id,
    name: v.name,
    gstin: v.gst_number || null,
    address: [v.address, v.state, v.pincode].filter(Boolean).join(', ') || null
  };
}

// Validate the items of a DC and return what to insert.
// excludeDcId: the DC being edited, whose own items do not count as "already on a DC".
async function prepareItems(client, companyId, items, excludeDcId = null) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, 'At least one item is required');
  }
  const ids = items.map((i) => parseInt(i && i.job_work_item_id, 10));
  if (ids.some((n) => !Number.isInteger(n) || n <= 0)) throw new HttpError(400, 'Each item needs a job_work_item_id');
  if (new Set(ids).size !== ids.length) throw new HttpError(400, 'The same request item is listed twice');

  const { rows: reqItems } = await client.query(
    `SELECT jwi.id, jwi.job_work_id, jwi.material_name, jwi.quantity, jwi.unit, jwi.stock_item_id,
            jwr.job_id, jwr.job_work_type
       FROM job_work_items jwi
       JOIN job_work_requests jwr ON jwr.id = jwi.job_work_id
      WHERE jwi.id = ANY($1) AND jwr.company_id = $2
      FOR UPDATE OF jwi`,
    [ids, companyId]
  );
  const byId = new Map(reqItems.map((r) => [r.id, r]));
  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) throw new HttpError(404, `Request item(s) not found: ${missing.join(', ')}`);

  const { rows: taken } = await client.query(
    `SELECT di.job_work_item_id, d.dc_number
       FROM jobwork_dc_items di JOIN jobwork_dcs d ON d.id = di.dc_id
      WHERE di.job_work_item_id = ANY($1) AND ($2::int IS NULL OR di.dc_id <> $2)`,
    [ids, excludeDcId]
  );
  if (taken.length) {
    const t = taken[0];
    throw new HttpError(409, `"${byId.get(t.job_work_item_id).material_name}" is already on DC ${t.dc_number}`);
  }

  const stockIds = items.map((i, idx) => parseInt(i.stock_item_id, 10) || byId.get(ids[idx]).stock_item_id);
  stockIds.forEach((sid, idx) => {
    if (!sid) {
      throw new HttpError(400, `Create stock item first for "${byId.get(ids[idx]).material_name}"`);
    }
  });
  const { rows: stockRows } = await client.query(
    'SELECT id, name, hsn FROM stock_items WHERE id = ANY($1) AND company_id = $2',
    [stockIds, companyId]
  );
  const stockById = new Map(stockRows.map((s) => [s.id, s]));

  return items.map((item, idx) => {
    const reqItem = byId.get(ids[idx]);
    const stock = stockById.get(stockIds[idx]);
    if (!stock) throw new HttpError(400, `Stock item ${stockIds[idx]} not found`);

    if (item.quantity === undefined || item.quantity === null || item.quantity === '') {
      throw new HttpError(400, `Quantity is required for "${reqItem.material_name}"`);
    }
    if (Number(item.quantity) !== Number(reqItem.quantity)) {
      throw new HttpError(
        400,
        `Quantity for "${reqItem.material_name}" must equal the requested ${Number(reqItem.quantity)} (full quantity only)`
      );
    }
    const unitValue = text(item.unit_value);
    if (!MONEY_RE.test(unitValue)) {
      throw new HttpError(400, `unit_value for "${reqItem.material_name}" must be a non-negative amount with up to 2 decimals`);
    }
    return { reqItem, stock, unitValue };
  });
}

async function insertItems(client, dcId, prepared) {
  for (const { reqItem, stock, unitValue } of prepared) {
    await client.query(
      `INSERT INTO jobwork_dc_items
         (dc_id, job_work_item_id, stock_item_id, description, hsn_code, quantity, unit, unit_value, total_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::numeric, ROUND($8::numeric * $6::numeric, 2))`,
      [dcId, reqItem.id, stock.id, reqItem.material_name, stock.hsn, reqItem.quantity, reqItem.unit, unitValue]
    );
    await client.query(
      'UPDATE job_work_items SET stock_item_id = $1, unit_value = $2::numeric WHERE id = $3',
      [stock.id, unitValue, reqItem.id]
    );
  }
}

async function getDcDetail(db, dcId, companyId) {
  const { rows } = await db.query(
    `SELECT d.*, cu.name AS created_by_name, au.name AS approved_by_name, loc.name AS current_location_name,
            (SELECT COALESCE(SUM(total_value), 0) FROM jobwork_dc_items WHERE dc_id = d.id) AS total_value
       FROM jobwork_dcs d
       LEFT JOIN users cu ON cu.id = d.created_by
       LEFT JOIN users au ON au.id = d.approved_by
       LEFT JOIN master_vendors loc ON loc.id = d.current_location_vendor_id
      WHERE d.id = $1 AND d.company_id = $2`,
    [dcId, companyId]
  );
  if (rows.length === 0) return null;
  const dc = rows[0];

  const items = await db.query(
    `SELECT di.*, jwi.hsn AS pm_hsn, jwi.item_kind, jwi.item_code AS pm_item_code, st.name AS stock_item_name, jwr.id AS request_id, jwr.job_id, jwr.project_id, p.name AS project_name
       FROM jobwork_dc_items di
       JOIN stock_items st ON st.id = di.stock_item_id
       JOIN job_work_items jwi ON jwi.id = di.job_work_item_id
       JOIN job_work_requests jwr ON jwr.id = jwi.job_work_id
       LEFT JOIN projects p ON p.id = jwr.project_id
      WHERE di.dc_id = $1 ORDER BY di.id`,
    [dcId]
  );
  const movements = await db.query(
    `SELECT m.*, fv.name AS from_vendor_name, tv.name AS to_vendor_name
       FROM jobwork_dc_movements m
       JOIN master_vendors fv ON fv.id = m.from_vendor_id
       JOIN master_vendors tv ON tv.id = m.to_vendor_id
      WHERE m.dc_id = $1 ORDER BY m.moved_at, m.id`,
    [dcId]
  );
  const returns = await db.query(
    `SELECT r.*, v.name AS vendor_name, g.rate AS gst_rate, g.label AS gst_label, COALESCE(json_agg(json_build_object('dc_item_id', ri.dc_item_id, 'quantity_received', ri.quantity_received))
              FILTER (WHERE ri.id IS NOT NULL), '[]') AS items
       FROM jobwork_returns r JOIN master_vendors v ON v.id = r.vendor_id LEFT JOIN gst_rates g ON g.id = r.gst_rate_id LEFT JOIN jobwork_return_items ri ON ri.return_id = r.id
      WHERE r.dc_id = $1 GROUP BY r.id, v.name, g.rate, g.label ORDER BY r.received_at, r.id`,
    [dcId]
  );
  return { ...dc, items: items.rows, movements: movements.rows, returns: returns.rows };
}

// Lock a DC row for a state change. 404 if it is not in the caller's company.
async function lockDc(client, dcId, companyId) {
  const { rows } = await client.query(
    'SELECT * FROM jobwork_dcs WHERE id = $1 AND company_id = $2 FOR UPDATE',
    [dcId, companyId]
  );
  if (rows.length === 0) throw new HttpError(404, 'Delivery challan not found');
  return rows[0];
}

async function refreshRequestStatuses(client, requestIds) {
  for (const id of new Set(requestIds)) await recomputeRequestStatus(client, id);
}

// ---------- stock items ----------

router.get('/stock-items', requireRole('store_incharge', 'accountant', 'project_manager', 'npd'), wrap(async (req, res) => {
  const search = text(req.query.search);
  const { rows } = await pool.query(
    `SELECT id, name, hsn, unit, created_by, created_at
       FROM stock_items
      WHERE company_id = $1 AND ($2 = '' OR name ILIKE '%' || $2 || '%')
      ORDER BY name LIMIT 200`,
    [req.user.company_id, search]
  );
  res.json({ stock_items: rows });
}));

router.post('/stock-items', requireRole('accountant'), wrap(async (req, res) => {
  const name = text(req.body.name);
  const unit = text(req.body.unit);
  if (!name) throw new HttpError(400, 'name is required');
  if (!unit) throw new HttpError(400, 'unit is required');
  const { rows } = await pool.query(
    `INSERT INTO stock_items (company_id, name, hsn, unit, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.user.company_id, name, text(req.body.hsn) || null, unit, req.user.id]
  );
  res.status(201).json({ stock_item: rows[0] });
}));

// ---------- pending items ----------

router.get('/pending-items', requireRole('store_incharge', 'accountant'), wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT jwi.id AS job_work_item_id, jwi.material_name, jwi.hsn, jwi.quantity, jwi.unit, jwi.item_kind, jwi.item_code,
            jwi.stock_item_id, st.name AS stock_item_name, jwi.unit_value,
            sug.id AS suggested_stock_item_id, sug.name AS suggested_stock_item_name,
            jwr.id AS request_id, jwr.job_id, jwr.job_work_type, jwr.status AS request_status,
            jwr.created_at, jwr.project_id, p.name AS project_name, u.name AS requested_by
       FROM job_work_items jwi
       JOIN job_work_requests jwr ON jwr.id = jwi.job_work_id
       LEFT JOIN projects p ON p.id = jwr.project_id
       LEFT JOIN stock_items st ON st.id = jwi.stock_item_id
       LEFT JOIN users u ON u.id = jwr.created_by
       LEFT JOIN LATERAL (
         -- the stock item Store last mapped for the same BOM row (remembered on job_work_items.stock_item_id)
         SELECT s2.id, s2.name
           FROM job_work_items j2
           JOIN stock_items s2 ON s2.id = j2.stock_item_id AND s2.company_id = jwr.company_id
          WHERE j2.id <> jwi.id
            AND ((jwi.bom_item_id IS NOT NULL AND j2.bom_item_id = jwi.bom_item_id)
              OR (jwi.revision_bom_item_id IS NOT NULL AND j2.revision_bom_item_id = jwi.revision_bom_item_id))
          ORDER BY j2.id DESC LIMIT 1
       ) sug ON jwi.stock_item_id IS NULL
      WHERE jwr.company_id = $1
        AND NOT EXISTS (SELECT 1 FROM jobwork_dc_items di WHERE di.job_work_item_id = jwi.id)
      ORDER BY p.name, jwr.created_at, jwi.id`,
    [req.user.company_id]
  );
  const groups = new Map();
  for (const r of rows) {
    const key = r.project_id === null ? 0 : r.project_id;
    if (!groups.has(key)) groups.set(key, { project_id: r.project_id, project_name: r.project_name, items: [] });
    groups.get(key).items.push(r);
  }
  res.json({ projects: [...groups.values()] });
}));

// ---------- delivery challans ----------

router.post('/', requireRole('store_incharge'), wrap(async (req, res) => {
  const { company_id: companyId, id: userId } = req.user;
  const body = req.body || {};
  const vendorId = requireId(body.vendor_id, 'vendor_id');
  const weights = {
    loaded: optionalNumber(body.loaded_vehicle_weight, 'loaded_vehicle_weight'),
    unloaded: optionalNumber(body.unloaded_vehicle_weight, 'unloaded_vehicle_weight')
  };
  const dcDate = text(body.dc_date) || null;
  if (dcDate && !/^\d{4}-\d{2}-\d{2}$/.test(dcDate)) throw new HttpError(400, 'dc_date must be YYYY-MM-DD');
  const override = text(body.dc_number);
  if (override.length > 50) throw new HttpError(400, 'dc_number is too long');

  const dc = await withTransaction(async (client) => {
    const vendor = await getVendorSnapshot(client, vendorId, companyId);
    const prepared = await prepareItems(client, companyId, body.items);

    // typed (internal DCs keep their longer limit) or automatic; 'manual' companies must type it
    const { number: dcNumber } = await resolveNumber(client, companyId, 'DC', { typed: override, date: dcDate, maxLength: 50 });
    const process = text(body.process) || [...new Set(prepared.map((p) => p.reqItem.job_work_type))].join(', ');

    const { rows } = await client.query(
      `INSERT INTO jobwork_dcs
         (company_id, dc_number, dc_date, vendor_id, vendor_name, vendor_gstin, vendor_address, process,
          vehicle_number, loaded_vehicle_weight, unloaded_vehicle_weight, status, created_by)
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5, $6, $7, $8, $9, $10, $11, 'dc_created', $12)
       RETURNING id`,
      [companyId, dcNumber, dcDate, vendor.id, vendor.name, vendor.gstin, vendor.address, process || null,
        text(body.vehicle_number) || null, weights.loaded, weights.unloaded, userId]
    );
    const dcId = rows[0].id;

    await insertItems(client, dcId, prepared);
    await refreshRequestStatuses(client, await dcRequestIds(client, dcId));
    await logHistory(client, dcId, userId, null, 'dc_created', `Delivery challan ${dcNumber} created for ${vendor.name}`);

    const [projectId] = await dcProjectIds(client, dcId);
    await notifyRole(client, companyId, 'accountant', 'Delivery Challan Awaiting Approval',
      `DC ${dcNumber} to ${vendor.name} needs your approval.`, 'jobwork_dc_pending', projectId || null);

    return getDcDetail(client, dcId, companyId);
  });
  res.status(201).json({ dc });
}));

router.put('/:id(\\d+)', requireRole('store_incharge'), wrap(async (req, res) => {
  const { company_id: companyId, id: userId } = req.user;
  const dcId = parseInt(req.params.id, 10);
  const body = req.body || {};

  const dc = await withTransaction(async (client) => {
    const current = await lockDc(client, dcId, companyId);
    if (!['dc_created', 'rejected'].includes(current.status)) {
      throw new HttpError(400, `A DC can only be edited while dc_created or rejected (this one is ${current.status})`);
    }

    const sets = [];
    const values = [];
    const set = (column, value) => { values.push(value); sets.push(`${column} = $${values.length}`); };

    if (body.vendor_id !== undefined) {
      const vendor = await getVendorSnapshot(client, requireId(body.vendor_id, 'vendor_id'), companyId);
      set('vendor_id', vendor.id); set('vendor_name', vendor.name);
      set('vendor_gstin', vendor.gstin); set('vendor_address', vendor.address);
    }
    if (body.dc_date !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text(body.dc_date))) throw new HttpError(400, 'dc_date must be YYYY-MM-DD');
      set('dc_date', text(body.dc_date));
    }
    if (body.dc_number !== undefined) {
      const n = text(body.dc_number);
      if (!n || n.length > 50) throw new HttpError(400, 'dc_number must be 1-50 characters');
      await assertDcNumberFree(client, companyId, n, { excludeDcId: dcId });
      set('dc_number', n);
    }
    if (body.process !== undefined) set('process', text(body.process) || null);
    if (body.vehicle_number !== undefined) set('vehicle_number', text(body.vehicle_number) || null);
    if (body.loaded_vehicle_weight !== undefined) set('loaded_vehicle_weight', optionalNumber(body.loaded_vehicle_weight, 'loaded_vehicle_weight'));
    if (body.unloaded_vehicle_weight !== undefined) set('unloaded_vehicle_weight', optionalNumber(body.unloaded_vehicle_weight, 'unloaded_vehicle_weight'));

    const affectedRequests = await dcRequestIds(client, dcId);
    let removedItems = [];
    if (body.items !== undefined) {
      const prepared = await prepareItems(client, companyId, body.items, dcId);
      const { rows: oldItems } = await client.query(
        `SELECT di.job_work_item_id, di.description, jwr.project_id
           FROM jobwork_dc_items di
           JOIN job_work_items jwi ON jwi.id = di.job_work_item_id
           JOIN job_work_requests jwr ON jwr.id = jwi.job_work_id
          WHERE di.dc_id = $1`,
        [dcId]
      );
      const keptIds = new Set(prepared.map((p) => p.reqItem.id));
      removedItems = oldItems.filter((o) => !keptIds.has(o.job_work_item_id));
      await client.query('DELETE FROM jobwork_dc_items WHERE dc_id = $1', [dcId]);
      await insertItems(client, dcId, prepared);
    }

    // Editing a rejected DC resubmits it for approval.
    const resubmit = current.status === 'rejected';
    if (resubmit) {
      set('status', 'dc_created'); set('rejection_reason', null);
      set('approved_by', null); set('approved_at', null);
    }
    sets.push('updated_at = CURRENT_TIMESTAMP');
    values.push(dcId);
    await client.query(`UPDATE jobwork_dcs SET ${sets.join(', ')} WHERE id = $${values.length}`, values);

    await refreshRequestStatuses(client, [...affectedRequests, ...(await dcRequestIds(client, dcId))]);

    const updated = await getDcDetail(client, dcId, companyId);

    // The remaining items' projects are logged by logHistory; projects that lost an item
    // (and may no longer be on the DC at all) get their own row.
    const removedByProject = new Map();
    for (const r of removedItems) {
      if (!r.project_id) continue;
      if (!removedByProject.has(r.project_id)) removedByProject.set(r.project_id, []);
      removedByProject.get(r.project_id).push(r.description);
    }
    for (const [projectId, names] of removedByProject) {
      await client.query(
        `INSERT INTO project_status_history (project_id, old_status, new_status, changed_by, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [projectId, 'Job Work: dc_created', `Job Work: removed from DC ${updated.dc_number}`, userId,
          `Removed from delivery challan ${updated.dc_number}: ${names.join(', ')}`]
      );
    }

    if (resubmit) {
      await logHistory(client, dcId, userId, 'rejected', 'dc_created', `Delivery challan ${updated.dc_number} corrected and resubmitted`);
      const [projectId] = await dcProjectIds(client, dcId);
      await notifyRole(client, companyId, 'accountant', 'Delivery Challan Resubmitted',
        `DC ${updated.dc_number} was corrected and needs approval again.`, 'jobwork_dc_pending', projectId || null);
    }
    return updated;
  });
  res.json({ dc });
}));

router.get('/', requireRole('store_incharge', 'accountant'), wrap(async (req, res) => {
  const { status, vendor_id, project_id, from, to } = req.query;
  const where = ['d.company_id = $1'];
  const values = [req.user.company_id];
  const add = (sql, value) => { values.push(value); where.push(sql.replace('?', `$${values.length}`)); };

  if (status) {
    if (!DC_STATUSES.includes(status)) throw new HttpError(400, 'Unknown status');
    add('d.status = ?', status);
  }
  if (vendor_id) add('d.vendor_id = ?', requireId(vendor_id, 'vendor_id'));
  if (project_id) {
    add(`EXISTS (SELECT 1 FROM jobwork_dc_items di
                   JOIN job_work_items jwi ON jwi.id = di.job_work_item_id
                   JOIN job_work_requests jwr ON jwr.id = jwi.job_work_id
                  WHERE di.dc_id = d.id AND jwr.project_id = ?)`, requireId(project_id, 'project_id'));
  }
  for (const [value, label, sql] of [[from, 'from', 'd.dc_date >= ?::date'], [to, 'to', 'd.dc_date <= ?::date']]) {
    if (!value) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new HttpError(400, `${label} must be YYYY-MM-DD`);
    add(sql, value);
  }

  const { rows } = await pool.query(
    `SELECT d.id, d.dc_number, d.dc_date, d.vendor_id, d.vendor_name, d.status, d.eway_bill_no,
            d.current_location_vendor_id, d.created_at,
            (SELECT COUNT(*) FROM jobwork_dc_items WHERE dc_id = d.id)::int AS item_count,
            (SELECT COALESCE(SUM(total_value), 0) FROM jobwork_dc_items WHERE dc_id = d.id) AS total_value,
            (SELECT COALESCE(array_agg(DISTINCT p.name), '{}')
               FROM jobwork_dc_items di
               JOIN job_work_items jwi ON jwi.id = di.job_work_item_id
               JOIN job_work_requests jwr ON jwr.id = jwi.job_work_id
               JOIN projects p ON p.id = jwr.project_id
              WHERE di.dc_id = d.id) AS projects
       FROM jobwork_dcs d
      WHERE ${where.join(' AND ')}
      ORDER BY d.created_at DESC, d.id DESC`,
    values
  );
  res.json({ dcs: rows });
}));

router.get('/:id(\\d+)', requireRole('store_incharge', 'accountant'), wrap(async (req, res) => {
  const dc = await getDcDetail(pool, parseInt(req.params.id, 10), req.user.company_id);
  if (!dc) throw new HttpError(404, 'Delivery challan not found');
  res.json({ dc: { ...dc, eway_requirement: await ewayRequirement(pool, dc.id) } });
}));

router.post('/:id(\\d+)/approve', requireRole('accountant'), wrap(async (req, res) => {
  const { company_id: companyId, id: userId } = req.user;
  const dcId = parseInt(req.params.id, 10);
  const eway = text(req.body && req.body.eway_bill_no);
  if (eway && !EWAY_RE.test(eway)) throw new HttpError(400, 'E-way bill number must be exactly 12 digits');

  const dc = await withTransaction(async (client) => {
    const current = await lockDc(client, dcId, companyId);
    if (current.status !== 'dc_created') {
      throw new HttpError(400, `Only a dc_created DC can be approved (this one is ${current.status})`);
    }
    if (!eway) {
      const req_ = await ewayRequirement(client, dcId);
      if (req_.required) {
        throw new HttpError(400, `E-way bill number is required: ${req_.reasons.join('; ')}`);
      }
    }

    await client.query(
      `UPDATE jobwork_dcs
          SET status = 'approved', approved_by = $2, approved_at = CURRENT_TIMESTAMP,
              eway_bill_no = $3, rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [dcId, userId, eway || null]
    );
    await refreshRequestStatuses(client, await dcRequestIds(client, dcId));
    await logHistory(client, dcId, userId, 'dc_created', 'approved', `Delivery challan ${current.dc_number} approved`);
    const [projectId] = await dcProjectIds(client, dcId);
    await notifyUser(client, current.created_by, 'Delivery Challan Approved',
      `DC ${current.dc_number} is approved and ready to dispatch.`, 'jobwork_dc_approved', projectId || null);
    return getDcDetail(client, dcId, companyId);
  });
  res.json({ dc });
}));

router.post('/:id(\\d+)/reject', requireRole('accountant'), wrap(async (req, res) => {
  const { company_id: companyId, id: userId } = req.user;
  const dcId = parseInt(req.params.id, 10);
  const reason = text(req.body && req.body.reason);
  if (!reason) throw new HttpError(400, 'A rejection reason is required');

  const dc = await withTransaction(async (client) => {
    const current = await lockDc(client, dcId, companyId);
    if (current.status !== 'dc_created') {
      throw new HttpError(400, `Only a dc_created DC can be rejected (this one is ${current.status})`);
    }
    await client.query(
      `UPDATE jobwork_dcs
          SET status = 'rejected', rejection_reason = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
      [dcId, reason]
    );
    await refreshRequestStatuses(client, await dcRequestIds(client, dcId));
    await logHistory(client, dcId, userId, 'dc_created', 'rejected', `Delivery challan ${current.dc_number} rejected: ${reason}`);
    const [projectId] = await dcProjectIds(client, dcId);
    await notifyUser(client, current.created_by, 'Delivery Challan Rejected',
      `DC ${current.dc_number} was rejected: ${reason}`, 'jobwork_dc_rejected', projectId || null);
    return getDcDetail(client, dcId, companyId);
  });
  res.json({ dc });
}));

// ---------- Phase 2b: dispatch, movement, returns, invoices, reports ----------

const OPEN_STATUSES = ['dispatched', 'partially_returned'];
const QTY_RE = /^\d+(\.\d{1,3})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function optionalDate(value, label) {
  const v = text(value);
  if (!v) return null;
  if (!DATE_RE.test(v)) throw new HttpError(400, `${label} must be YYYY-MM-DD`);
  return v;
}

async function vendorName(client, vendorId) {
  const { rows } = await client.query('SELECT name FROM master_vendors WHERE id = $1', [vendorId]);
  return rows.length ? rows[0].name : String(vendorId);
}

async function notifyRequesters(client, dcId, title, message, type) {
  const { rows } = await client.query(
    `SELECT DISTINCT jwr.created_by AS user_id, jwr.project_id
       FROM jobwork_dc_items di
       JOIN job_work_items jwi ON jwi.id = di.job_work_item_id
       JOIN job_work_requests jwr ON jwr.id = jwi.job_work_id
      WHERE di.dc_id = $1 AND jwr.created_by IS NOT NULL`,
    [dcId]
  );
  for (const r of rows) await notifyUser(client, r.user_id, title, message, type, r.project_id);
}

// Vendors the material has been with: the original vendor plus every move destination.
async function pathVendorIds(client, dc) {
  const { rows } = await client.query(
    'SELECT from_vendor_id, to_vendor_id FROM jobwork_dc_movements WHERE dc_id = $1',
    [dc.id]
  );
  const ids = new Set([dc.vendor_id]);
  for (const m of rows) { ids.add(m.from_vendor_id); ids.add(m.to_vendor_id); }
  return ids;
}

// Job charge + GST for a vendor invoice. Everything is computed in SQL on the job charge only
// (never on component value). Same state as ours -> CGST + SGST (half each, SGST takes the
// odd paisa); otherwise IGST. If a charge exists and either state is unknown the split cannot
// be decided, so we refuse rather than guess.
async function computeCharges(client, companyId, vendorId, body) {
  const charge = text(body.job_charge) || '0';
  if (!MONEY_RE.test(charge)) throw new HttpError(400, 'job_charge must be a non-negative amount with up to 2 decimals');
  const hasCharge = Number(charge) > 0;
  const gstRateId = body.gst_rate_id === undefined || body.gst_rate_id === null || body.gst_rate_id === ''
    ? null : requireId(body.gst_rate_id, 'gst_rate_id');

  if (hasCharge && !gstRateId) throw new HttpError(400, 'gst_rate_id is required when there is a job charge');
  let rate = null;
  if (gstRateId) {
    const r = await client.query('SELECT rate FROM gst_rates WHERE id = $1 AND is_active', [gstRateId]);
    if (r.rows.length === 0) throw new HttpError(400, 'GST rate not found or inactive');
    rate = r.rows[0].rate;
  }

  let intra = false;
  if (hasCharge) {
    const st = await client.query(
      `SELECT v.gst_number AS vendor_gstin, v.state AS vendor_state, c.gst_number AS company_gstin, c.state AS company_state
         FROM master_vendors v, companies c WHERE v.id = $1 AND c.id = $2`,
      [vendorId, companyId]
    );
    const row = st.rows[0] || {};
    const vs = stateOf(row.vendor_gstin, row.vendor_state);
    const cs = stateOf(row.company_gstin, row.company_state);
    if (!vs || !cs) {
      throw new HttpError(400, 'Set the GSTIN (or state) of the vendor and of the company first: they decide CGST+SGST vs IGST');
    }
    intra = vs === cs;
  }

  const { rows } = await client.query(
    `SELECT g.gst::numeric(14,2) AS gst,
            (CASE WHEN $3::boolean THEN ROUND(g.gst / 2, 2) ELSE 0 END)::numeric(14,2) AS cgst,
            (CASE WHEN $3::boolean THEN g.gst - ROUND(g.gst / 2, 2) ELSE 0 END)::numeric(14,2) AS sgst,
            (CASE WHEN $3::boolean THEN 0 ELSE g.gst END)::numeric(14,2) AS igst,
            ($1::numeric + g.gst)::numeric(14,2) AS total
       FROM (SELECT ROUND($1::numeric * COALESCE($2::numeric, 0) / 100, 2) AS gst) g`,
    [charge, rate, intra]
  );
  return { charge, gstRateId, rate, ...rows[0] };
}

async function assertInvoiceNew(client, companyId, vendorId, invoiceNo) {
  if (!invoiceNo) return;
  const { rows } = await client.query(
    `SELECT d.dc_number FROM jobwork_returns r JOIN jobwork_dcs d ON d.id = r.dc_id
      WHERE d.company_id = $1 AND r.vendor_id = $2 AND LOWER(r.invoice_no) = LOWER($3)`,
    [companyId, vendorId, invoiceNo]
  );
  if (rows.length) throw new HttpError(409, `Invoice ${invoiceNo} from this vendor is already recorded (DC ${rows[0].dc_number})`);
}

async function insertReturnRow(client, { dcId, vendorId, entryType, body, charges, userId }) {
  const { rows } = await client.query(
    `INSERT INTO jobwork_returns
       (dc_id, vendor_id, entry_type, vendor_dc_no, vendor_dc_date, invoice_no, invoice_date, job_charge, sac_code,
        gst_rate_id, gst_amount, cgst_amount, sgst_amount, igst_amount, total, received_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::numeric, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
    [dcId, vendorId, entryType, text(body.vendor_dc_no) || null, optionalDate(body.vendor_dc_date, 'vendor_dc_date'),
      text(body.invoice_no) || null, optionalDate(body.invoice_date, 'invoice_date'), charges.charge,
      text(body.sac_code) || null, charges.gstRateId, charges.gst, charges.cgst, charges.sgst, charges.igst,
      charges.total, userId]
  );
  return rows[0];
}

router.post('/:id(\\d+)/dispatch', requireRole('store_incharge'), wrap(async (req, res) => {
  const { company_id: companyId, id: userId } = req.user;
  const dcId = parseInt(req.params.id, 10);
  const dc = await withTransaction(async (client) => {
    const current = await lockDc(client, dcId, companyId);
    if (current.status !== 'approved') {
      throw new HttpError(400, `Only an approved DC can be dispatched (this one is ${current.status})`);
    }
    await client.query(
      `UPDATE jobwork_dcs SET status = 'dispatched', dispatched_at = CURRENT_TIMESTAMP,
              current_location_vendor_id = vendor_id, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [dcId]
    );
    await refreshRequestStatuses(client, await dcRequestIds(client, dcId));
    await logHistory(client, dcId, userId, 'approved', 'dispatched', `Delivery challan ${current.dc_number} dispatched to ${current.vendor_name}`);
    await notifyRequesters(client, dcId, 'Material Dispatched',
      `DC ${current.dc_number} has left the factory for ${current.vendor_name}.`, 'jobwork_dc_dispatched');
    return getDcDetail(client, dcId, companyId);
  });
  res.json({ dc });
}));

// Vendor B forwards the material to vendor C (bill to us, ship to C).
router.post('/:id(\\d+)/move', requireRole('store_incharge'), wrap(async (req, res) => {
  const { company_id: companyId, id: userId } = req.user;
  const dcId = parseInt(req.params.id, 10);
  const body = req.body || {};
  const toVendorId = requireId(body.to_vendor_id, 'to_vendor_id');
  let movedAt = null;
  if (text(body.moved_at)) {
    if (Number.isNaN(Date.parse(body.moved_at))) throw new HttpError(400, 'moved_at is not a valid date');
    movedAt = new Date(body.moved_at).toISOString();
  }

  const dc = await withTransaction(async (client) => {
    const current = await lockDc(client, dcId, companyId);
    if (!OPEN_STATUSES.includes(current.status)) {
      throw new HttpError(400, `Only a dispatched or partially returned DC can be moved (this one is ${current.status})`);
    }
    const to = await getVendorSnapshot(client, toVendorId, companyId);
    const fromId = current.current_location_vendor_id || current.vendor_id;
    if (to.id === fromId) throw new HttpError(400, `The material is already at ${to.name}`);

    await client.query(
      `INSERT INTO jobwork_dc_movements (dc_id, from_vendor_id, to_vendor_id, vendor_dc_no, moved_at, note, created_by)
       VALUES ($1, $2, $3, $4, COALESCE($5::timestamp, CURRENT_TIMESTAMP), $6, $7)`,
      [dcId, fromId, to.id, text(body.vendor_dc_no) || null, movedAt, text(body.note) || null, userId]
    );
    await client.query(
      'UPDATE jobwork_dcs SET current_location_vendor_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [dcId, to.id]
    );
    const fromName = await vendorName(client, fromId);
    await logHistory(client, dcId, userId, current.status, current.status,
      `Delivery challan ${current.dc_number} moved from ${fromName} to ${to.name}`);
    await notifyRequesters(client, dcId, 'Material Moved',
      `DC ${current.dc_number} moved from ${fromName} to ${to.name}.`, 'jobwork_dc_moved');
    return getDcDetail(client, dcId, companyId);
  });
  res.json({ dc });
}));

// Material comes back. Must come from the vendor the DC is currently with.
router.post('/:id(\\d+)/returns', requireRole('store_incharge'), wrap(async (req, res) => {
  const { company_id: companyId, id: userId } = req.user;
  const dcId = parseInt(req.params.id, 10);
  const body = req.body || {};
  const vendorId = requireId(body.vendor_id, 'vendor_id');

  if (!Array.isArray(body.items) || body.items.length === 0) throw new HttpError(400, 'At least one returned item is required');
  const lines = body.items.map((i) => ({
    dcItemId: parseInt(i && i.dc_item_id, 10),
    qty: text(i && i.quantity_received)
  }));
  for (const l of lines) {
    if (!Number.isInteger(l.dcItemId) || l.dcItemId <= 0) throw new HttpError(400, 'Each returned item needs a dc_item_id');
    if (!QTY_RE.test(l.qty) || Number(l.qty) <= 0) throw new HttpError(400, 'quantity_received must be a positive number (up to 3 decimals)');
  }
  if (new Set(lines.map((l) => l.dcItemId)).size !== lines.length) throw new HttpError(400, 'The same DC item is listed twice');

  const result = await withTransaction(async (client) => {
    const current = await lockDc(client, dcId, companyId);
    if (!OPEN_STATUSES.includes(current.status)) {
      throw new HttpError(400, `Returns can only be recorded against a dispatched or partially returned DC (this one is ${current.status})`);
    }
    const location = current.current_location_vendor_id || current.vendor_id;
    if (vendorId !== location) {
      throw new HttpError(400, `A return must come from the vendor the material is with now: ${await vendorName(client, location)}`);
    }

    const { rows: dcItems } = await client.query(
      'SELECT id, description, quantity, returned_quantity FROM jobwork_dc_items WHERE dc_id = $1 AND id = ANY($2) FOR UPDATE',
      [dcId, lines.map((l) => l.dcItemId)]
    );
    const itemById = new Map(dcItems.map((i) => [i.id, i]));
    for (const l of lines) {
      if (!itemById.has(l.dcItemId)) throw new HttpError(400, `Item ${l.dcItemId} is not on this DC`);
    }

    const charges = await computeCharges(client, companyId, vendorId, body);
    if (Number(charges.charge) > 0 && !text(body.invoice_no)) {
      throw new HttpError(400, 'invoice_no is required when there is a job charge');
    }
    await assertInvoiceNew(client, companyId, vendorId, text(body.invoice_no));

    const ret = await insertReturnRow(client, { dcId, vendorId, entryType: 'return', body, charges, userId });

    for (const l of lines) {
      const upd = await client.query(
        `UPDATE jobwork_dc_items SET returned_quantity = returned_quantity + $3::numeric
          WHERE id = $1 AND dc_id = $2 AND returned_quantity + $3::numeric <= quantity`,
        [l.dcItemId, dcId, l.qty]
      );
      if (upd.rowCount === 0) {
        const item = itemById.get(l.dcItemId);
        const pending = Number(item.quantity) - Number(item.returned_quantity);
        throw new HttpError(400, `Cannot receive ${l.qty} of "${item.description}": only ${pending} still pending`);
      }
      await client.query(
        'INSERT INTO jobwork_return_items (return_id, dc_item_id, quantity_received) VALUES ($1, $2, $3::numeric)',
        [ret.id, l.dcItemId, l.qty]
      );
    }

    const { rows: totals } = await client.query(
      'SELECT bool_and(returned_quantity = quantity) AS all_back FROM jobwork_dc_items WHERE dc_id = $1',
      [dcId]
    );
    const newStatus = totals[0].all_back ? 'closed' : 'partially_returned';
    if (newStatus === 'closed') {
      await client.query(
        `UPDATE jobwork_dcs SET status = 'closed', closed_at = CURRENT_TIMESTAMP, current_location_vendor_id = NULL,
                updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [dcId]
      );
    } else {
      await client.query("UPDATE jobwork_dcs SET status = 'partially_returned', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [dcId]);
    }
    await refreshRequestStatuses(client, await dcRequestIds(client, dcId));

    const from = await vendorName(client, vendorId);
    await logHistory(client, dcId, userId, current.status, newStatus,
      newStatus === 'closed'
        ? `Delivery challan ${current.dc_number} fully returned from ${from} and closed`
        : `Partial return recorded on delivery challan ${current.dc_number} from ${from}`);
    await notifyRequesters(client, dcId, newStatus === 'closed' ? 'Job Work Complete' : 'Material Returned',
      newStatus === 'closed' ? `DC ${current.dc_number} is fully back and closed.` : `DC ${current.dc_number} has a partial return from ${from}.`,
      newStatus === 'closed' ? 'jobwork_dc_closed' : 'jobwork_dc_return');
    await notifyRole(client, companyId, 'accountant', 'Job Work Return Recorded',
      `DC ${current.dc_number}: return from ${from}${text(body.invoice_no) ? `, invoice ${text(body.invoice_no)}` : ''}.`,
      'jobwork_return_recorded');

    return { ret, dc: await getDcDetail(client, dcId, companyId) };
  });
  res.status(201).json({ return: result.ret, dc: result.dc });
}));

// A vendor's invoice with no goods coming back, e.g. vendor B after the material moved on to C.
// Stored in jobwork_returns with entry_type 'invoice_only' (no return_items) so Accounts finds
// every vendor invoice and its GST split in one table.
router.post('/:id(\\d+)/vendor-invoices', requireRole('store_incharge'), wrap(async (req, res) => {
  const { company_id: companyId, id: userId } = req.user;
  const dcId = parseInt(req.params.id, 10);
  const body = req.body || {};
  const vendorId = requireId(body.vendor_id, 'vendor_id');
  const invoiceNo = text(body.invoice_no);
  if (!invoiceNo) throw new HttpError(400, 'invoice_no is required');

  const result = await withTransaction(async (client) => {
    const current = await lockDc(client, dcId, companyId);
    if (![...OPEN_STATUSES, 'closed'].includes(current.status)) {
      throw new HttpError(400, `Vendor invoices can only be recorded once the DC is dispatched (this one is ${current.status})`);
    }
    const path = await pathVendorIds(client, current);
    if (!path.has(vendorId)) throw new HttpError(400, 'That vendor has not handled this DC (it is not on the DC path)');

    const charges = await computeCharges(client, companyId, vendorId, body);
    await assertInvoiceNew(client, companyId, vendorId, invoiceNo);
    const invoice = await insertReturnRow(client, { dcId, vendorId, entryType: 'invoice_only', body, charges, userId });

    const name = await vendorName(client, vendorId);
    await logHistory(client, dcId, userId, current.status, current.status,
      `Vendor invoice ${invoiceNo} from ${name} recorded on delivery challan ${current.dc_number}`);
    await notifyRole(client, companyId, 'accountant', 'Vendor Invoice Recorded',
      `Invoice ${invoiceNo} from ${name} for DC ${current.dc_number}.`, 'jobwork_vendor_invoice');
    return { invoice, dc: await getDcDetail(client, dcId, companyId) };
  });
  res.status(201).json({ invoice: result.invoice, dc: result.dc });
}));

// Material outside the factory: open (dispatched / partially returned) DCs.
router.get('/reports/outside', requireRole('store_incharge', 'accountant'), wrap(async (req, res) => {
  const { vendor_id, project_id, from, to } = req.query;
  const where = ['d.company_id = $1', "d.status IN ('dispatched', 'partially_returned')"];
  const values = [req.user.company_id];
  const add = (sql, value) => { values.push(value); where.push(sql.replace('?', `$${values.length}`)); };

  if (vendor_id) add('d.current_location_vendor_id = ?', requireId(vendor_id, 'vendor_id'));
  if (project_id) {
    add(`EXISTS (SELECT 1 FROM jobwork_dc_items di
                   JOIN job_work_items jwi ON jwi.id = di.job_work_item_id
                   JOIN job_work_requests jwr ON jwr.id = jwi.job_work_id
                  WHERE di.dc_id = d.id AND jwr.project_id = ?)`, requireId(project_id, 'project_id'));
  }
  for (const [value, label, sql] of [[from, 'from', 'd.dispatched_at::date >= ?::date'], [to, 'to', 'd.dispatched_at::date <= ?::date']]) {
    if (!value) continue;
    if (!DATE_RE.test(value)) throw new HttpError(400, `${label} must be YYYY-MM-DD`);
    add(sql, value);
  }

  const { rows } = await pool.query(
    `SELECT d.id, d.dc_number, d.vendor_id, d.vendor_name, d.status, d.dispatched_at, d.current_location_vendor_id,
            loc.name AS current_location_name,
            COALESCE((SELECT MAX(moved_at) FROM jobwork_dc_movements m WHERE m.dc_id = d.id), d.dispatched_at) AS location_since,
            FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.dispatched_at)) / 86400)::int AS days_out,
            (SELECT COALESCE(SUM(total_value), 0) FROM jobwork_dc_items WHERE dc_id = d.id) AS total_value,
            (SELECT COALESCE(SUM(ROUND((quantity - returned_quantity) * unit_value, 2)), 0) FROM jobwork_dc_items WHERE dc_id = d.id) AS pending_value,
            (SELECT COALESCE(json_agg(json_build_object('description', description, 'unit', unit,
                     'sent', quantity, 'returned', returned_quantity, 'pending', quantity - returned_quantity) ORDER BY id), '[]')
               FROM jobwork_dc_items WHERE dc_id = d.id AND quantity > returned_quantity) AS pending_items,
            (SELECT COALESCE(array_agg(DISTINCT p.name), '{}') FROM jobwork_dc_items di
               JOIN job_work_items jwi ON jwi.id = di.job_work_item_id
               JOIN job_work_requests jwr ON jwr.id = jwi.job_work_id
               JOIN projects p ON p.id = jwr.project_id WHERE di.dc_id = d.id) AS projects
       FROM jobwork_dcs d LEFT JOIN master_vendors loc ON loc.id = d.current_location_vendor_id
      WHERE ${where.join(' AND ')} ORDER BY d.dispatched_at, d.id`,
    values
  );
  const sum = await pool.query('SELECT COALESCE(SUM(x), 0) AS total FROM unnest($1::numeric[]) AS x', [rows.map((r) => r.pending_value)]);
  res.json({ summary: { open_dcs: rows.length, pending_value: sum.rows[0].total }, dcs: rows });
}));

// Read-only job work status for one project: who has the material, since when, what is pending.
router.get('/project/:projectId(\\d+)', requireRole('project_manager'), wrap(async (req, res) => {
  const projectId = parseInt(req.params.projectId, 10);
  const { company_id: companyId, id: userId } = req.user;
  const proj = await pool.query('SELECT id, name, assigned_to FROM projects WHERE id = $1 AND company_id = $2', [projectId, companyId]);
  if (proj.rows.length === 0) throw new HttpError(404, 'Project not found');
  if (String(req.user.role).toLowerCase() === 'project_manager' && proj.rows[0].assigned_to !== userId) {
    throw new HttpError(403, 'You can only see job work for projects assigned to you');
  }

  const { rows } = await pool.query(
    `SELECT jwr.id AS request_id, jwr.job_id, jwr.job_work_type, jwr.status AS request_status,
            jwi.id AS job_work_item_id, jwi.material_name, jwi.quantity, jwi.unit,
            d.dc_number, d.status AS dc_status, d.vendor_name, d.dispatched_at, loc.name AS current_location_name,
            COALESCE(di.returned_quantity, 0) AS returned_quantity,
            COALESCE(di.quantity, jwi.quantity) - COALESCE(di.returned_quantity, 0) AS pending_quantity,
            COALESCE((SELECT MAX(moved_at) FROM jobwork_dc_movements m WHERE m.dc_id = d.id), d.dispatched_at) AS location_since,
            FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - d.dispatched_at)) / 86400)::int AS days_out
       FROM job_work_requests jwr
       JOIN job_work_items jwi ON jwi.job_work_id = jwr.id
       LEFT JOIN jobwork_dc_items di ON di.job_work_item_id = jwi.id
       LEFT JOIN jobwork_dcs d ON d.id = di.dc_id
       LEFT JOIN master_vendors loc ON loc.id = d.current_location_vendor_id
      WHERE jwr.project_id = $1 AND jwr.company_id = $2 ORDER BY jwr.created_at DESC, jwi.id`,
    [projectId, companyId]
  );

  const whereIs = (r) => {
    if (!r.dc_status) return 'In factory (no delivery challan yet)';
    if (r.dc_status === 'closed') return 'Returned to factory';
    if (OPEN_STATUSES.includes(r.dc_status)) return `At ${r.current_location_name || r.vendor_name}`;
    return `In factory (DC ${r.dc_number} ${r.dc_status})`;
  };
  const requests = new Map();
  for (const r of rows) {
    if (!requests.has(r.request_id)) {
      requests.set(r.request_id, { request_id: r.request_id, job_id: r.job_id, job_work_type: r.job_work_type, status: r.request_status, items: [] });
    }
    const out = OPEN_STATUSES.includes(r.dc_status);
    requests.get(r.request_id).items.push({
      job_work_item_id: r.job_work_item_id, material_name: r.material_name, quantity: r.quantity, unit: r.unit,
      dc_number: r.dc_number, dc_status: r.dc_status, vendor_name: r.vendor_name, where: whereIs(r),
      since: out ? r.location_since : null, days_out: out ? r.days_out : null,
      returned_quantity: r.returned_quantity, pending_quantity: r.pending_quantity
    });
  }
  res.json({ project: { id: proj.rows[0].id, name: proj.rows[0].name }, requests: [...requests.values()] });
}));

// ---------- Phase 3 support: dropdown data, tax preview, invoice list, attachment ----------

router.get('/gst-rates', requireRole('store_incharge', 'accountant'), wrap(async (req, res) => {
  const { rows } = await pool.query('SELECT id, rate, label FROM gst_rates WHERE is_active ORDER BY rate');
  res.json({ gst_rates: rows });
}));

// Same server-side calculation as a real return / invoice, without saving anything.
router.post('/tax-preview', requireRole('store_incharge', 'accountant'), wrap(async (req, res) => {
  const body = req.body || {};
  const vendorId = requireId(body.vendor_id, 'vendor_id');
  const client = await pool.connect();
  try {
    await getVendorSnapshot(client, vendorId, req.user.company_id);
    const c = await computeCharges(client, req.user.company_id, vendorId, body);
    const split = Number(c.gst) === 0 ? 'NONE' : Number(c.igst) > 0 ? 'IGST' : 'CGST_SGST';
    res.json({
      job_charge: c.charge, gst_rate: c.rate, gst_amount: c.gst, cgst_amount: c.cgst, sgst_amount: c.sgst,
      igst_amount: c.igst, total: c.total, split
    });
  } finally {
    client.release();
  }
}));

// Every vendor invoice and return charge with its GST split, optionally for one DC.
router.get('/vendor-invoices', requireRole('store_incharge', 'accountant'), wrap(async (req, res) => {
  const values = [req.user.company_id];
  let dcFilter = '';
  if (req.query.dc_id) { values.push(requireId(req.query.dc_id, 'dc_id')); dcFilter = ` AND d.id = $${values.length}`; }
  const { rows } = await pool.query(
    `SELECT r.id, r.dc_id, d.dc_number, r.entry_type, r.vendor_id, v.name AS vendor_name,
            r.vendor_dc_no, r.vendor_dc_date, r.invoice_no, r.invoice_date, r.job_charge, r.sac_code,
            g.label AS gst_label, g.rate AS gst_rate, r.gst_amount, r.cgst_amount, r.sgst_amount, r.igst_amount, r.total, r.received_at
       FROM jobwork_returns r
       JOIN jobwork_dcs d ON d.id = r.dc_id
       JOIN master_vendors v ON v.id = r.vendor_id
       LEFT JOIN gst_rates g ON g.id = r.gst_rate_id
      WHERE d.company_id = $1${dcFilter}
      ORDER BY r.received_at DESC, r.id DESC`,
    values
  );
  res.json({ invoices: rows });
}));

const dcUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
      cb(null, 'uploads');
    },
    filename: (req, file, cb) => cb(null, `jobwork-dc-${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 20 * 1024 * 1024 }
});

// Optional attachment (e.g. the signed paper challan), only while the DC is still editable.
router.post('/:id(\\d+)/attachment', requireRole('store_incharge'), dcUpload.single('attachment'), wrap(async (req, res) => {
  const dcId = parseInt(req.params.id, 10);
  if (!req.file) throw new HttpError(400, 'No file uploaded');
  try {
    const dc = await withTransaction(async (client) => {
      const current = await lockDc(client, dcId, req.user.company_id);
      if (!['dc_created', 'rejected'].includes(current.status)) {
        throw new HttpError(400, `An attachment can only be changed while the DC is dc_created or rejected (this one is ${current.status})`);
      }
      await client.query(
        'UPDATE jobwork_dcs SET attachment_path = $2, attachment_name = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [dcId, `/uploads/${req.file.filename}`, req.file.originalname]
      );
      return getDcDetail(client, dcId, req.user.company_id);
    });
    res.json({ dc });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    throw err;
  }
}));

// Our own state, used for the CGST+SGST vs IGST split and the interstate e-way bill rule.
router.get('/company-state', requireRole('store_incharge', 'accountant', 'management'), wrap(async (req, res) => {
  const { rows } = await pool.query('SELECT state FROM companies WHERE id = $1', [req.user.company_id]);
  res.json({ state: rows.length ? rows[0].state : null });
}));

router.put('/company-state', requireRole('management', 'admin'), wrap(async (req, res) => {
  const state = text(req.body && req.body.state);
  if (!state || state.length > 100) throw new HttpError(400, 'state is required (up to 100 characters)');
  await pool.query('UPDATE companies SET state = $2 WHERE id = $1', [req.user.company_id, state]);
  res.json({ state });
}));

// Printable delivery challan (same style as the external one; template in pdf/internalDc.js).
router.get('/:id(\\d+)/pdf', requireRole('store_incharge', 'accountant'), wrap(async (req, res) => {
  const dc = await getDcDetail(pool, parseInt(req.params.id, 10), req.user.company_id);
  if (!dc) throw new HttpError(404, 'Delivery challan not found');
  const company = (await pool.query('SELECT name, address, gst_number, state FROM companies WHERE id = $1', [req.user.company_id])).rows[0];
  const buffer = await require('../pdf/internalDc').build({ ...dc, company });
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="DC_${String(dc.dc_number).replace(/[^A-Za-z0-9._-]+/g, '_')}.pdf"`, 'Content-Length': buffer.length });
  res.end(buffer);
}));

module.exports = router;
