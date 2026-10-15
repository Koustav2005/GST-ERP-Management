// Shared helpers for Internal Job Work v2 (delivery challans).
// Spec: .kiro/specs/internal-job-work-v2/requirements.md

const pool = require('../config/database');

class HttpError extends Error {
  // extra: more fields for the JSON body (e.g. the id of the record a 409 is about) so the app can offer a next step
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra || null;
  }
}

const normRole = (role) => String(role || '').trim().toLowerCase();

// Case-insensitive role gate. admin/management may additionally GET/HEAD anything
// behind it; they never pass a write check unless listed explicitly.
const READ_ALL_ROLES = ['admin', 'management'];

function requireRole(...roles) {
  const allowed = roles.map(normRole);
  return (req, res, next) => {
    const role = normRole(req.user && req.user.role);
    const isRead = req.method === 'GET' || req.method === 'HEAD';
    if (allowed.includes(role) || (isRead && READ_ALL_ROLES.includes(role))) {
      return next();
    }
    return res.status(403).json({ error: `Role '${role || 'unknown'}' is not allowed to do this` });
  };
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// DC state of one request item -> rank. Items on no DC are rank 0.
// A rejected DC goes back to Store for editing, so it counts as dc_created.
const ITEM_RANK = {
  dc_created: 1,
  rejected: 1,
  approved: 2,
  dispatched: 3,
  partially_returned: 4,
  closed: 5
};
const REQUEST_STATUS_BY_RANK = ['requested', 'dc_created', 'approved', 'dispatched', 'partially_returned', 'closed'];

// Recompute job_work_requests.status from the DC state of its items.
// Call inside the same transaction that changed any DC / DC item.
//  - until every item is dispatched, the request shows its least-advanced item
//  - once all are dispatched or later: closed (all closed), partially_returned
//    (anything returned or any DC partially_returned/closed), else dispatched
async function recomputeRequestStatus(client, requestId) {
  const { rows } = await client.query(
    `SELECT d.status AS dc_status, di.returned_quantity
       FROM job_work_items jwi
       LEFT JOIN jobwork_dc_items di ON di.job_work_item_id = jwi.id
       LEFT JOIN jobwork_dcs d ON d.id = di.dc_id
      WHERE jwi.job_work_id = $1`,
    [requestId]
  );
  if (rows.length === 0) return null;

  const ranks = rows.map((r) => (r.dc_status ? ITEM_RANK[r.dc_status] || 0 : 0));
  const min = Math.min(...ranks);
  let status;
  if (min < 3) {
    status = REQUEST_STATUS_BY_RANK[min];
  } else if (min === 5) {
    status = 'closed';
  } else if (ranks.some((r) => r >= 4) || rows.some((r) => Number(r.returned_quantity) > 0)) {
    status = 'partially_returned';
  } else {
    status = 'dispatched';
  }

  await client.query('UPDATE job_work_requests SET status = $1 WHERE id = $2', [status, requestId]);
  return status;
}

async function dcRequestIds(client, dcId) {
  const { rows } = await client.query(
    `SELECT DISTINCT jwi.job_work_id AS request_id
       FROM jobwork_dc_items di
       JOIN job_work_items jwi ON jwi.id = di.job_work_item_id
      WHERE di.dc_id = $1`,
    [dcId]
  );
  return rows.map((r) => r.request_id);
}

async function dcProjectIds(client, dcId) {
  const { rows } = await client.query(
    `SELECT DISTINCT jwr.project_id
       FROM jobwork_dc_items di
       JOIN job_work_items jwi ON jwi.id = di.job_work_item_id
       JOIN job_work_requests jwr ON jwr.id = jwi.job_work_id
      WHERE di.dc_id = $1 AND jwr.project_id IS NOT NULL`,
    [dcId]
  );
  return rows.map((r) => r.project_id);
}

// One project_status_history row per project that has an item on the DC.
async function logHistory(client, dcId, userId, oldStatus, newStatus, note) {
  await client.query(
    `INSERT INTO project_status_history (project_id, old_status, new_status, changed_by, notes)
     SELECT DISTINCT jwr.project_id, $2::varchar, $3::varchar, $4::int, $5::text
       FROM jobwork_dc_items di
       JOIN job_work_items jwi ON jwi.id = di.job_work_item_id
       JOIN job_work_requests jwr ON jwr.id = jwi.job_work_id
      WHERE di.dc_id = $1 AND jwr.project_id IS NOT NULL`,
    [dcId, oldStatus ? `Job Work: ${oldStatus}` : null, `Job Work: ${newStatus}`, userId, note]
  );
}

// data: structured payload (request_id, dc_id, ...) so the app never parses the message text.
async function notifyUser(client, userId, title, message, type, projectId = null, data = null) {
  if (!userId) return;
  await client.query(
    `INSERT INTO notifications (user_id, title, message, type, project_id, data) VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, title, message, type, projectId, data ? JSON.stringify(data) : null]
  );
}

async function notifyRole(client, companyId, role, title, message, type, projectId = null, data = null) {
  await client.query(
    `INSERT INTO notifications (user_id, title, message, type, project_id, data)
     SELECT id, $3, $4, $5, $6, $7::jsonb FROM users WHERE company_id = $1 AND LOWER(role) = $2`,
    [companyId, normRole(role), title, message, type, projectId, data ? JSON.stringify(data) : null]
  );
}

// ---- state of a party, for the CGST/SGST vs IGST split and the interstate e-way rule ----
// The first two digits of a GSTIN are the state code, so the GSTIN wins when it has a valid
// one; the free-text state is only a fallback for parties without a (usable) GSTIN.
const GST_STATE_CODES = {
  '01': 'jammu and kashmir', '02': 'himachal pradesh', '03': 'punjab', '04': 'chandigarh',
  '05': 'uttarakhand', '06': 'haryana', '07': 'delhi', '08': 'rajasthan', '09': 'uttar pradesh',
  '10': 'bihar', '11': 'sikkim', '12': 'arunachal pradesh', '13': 'nagaland', '14': 'manipur',
  '15': 'mizoram', '16': 'tripura', '17': 'meghalaya', '18': 'assam', '19': 'west bengal',
  '20': 'jharkhand', '21': 'odisha', '22': 'chhattisgarh', '23': 'madhya pradesh', '24': 'gujarat',
  '26': 'dadra and nagar haveli and daman and diu', '27': 'maharashtra', '29': 'karnataka', '30': 'goa',
  '31': 'lakshadweep', '32': 'kerala', '33': 'tamil nadu', '34': 'puducherry',
  '35': 'andaman and nicobar islands', '36': 'telangana', '37': 'andhra pradesh', '38': 'ladakh'
};
const STATE_ALIASES = {
  orissa: 'odisha',
  pondicherry: 'puducherry',
  'jammu & kashmir': 'jammu and kashmir',
  'andaman & nicobar islands': 'andaman and nicobar islands',
  'dadra and nagar haveli': 'dadra and nagar haveli and daman and diu',
  'daman and diu': 'dadra and nagar haveli and daman and diu'
};

const normState = (s) => String(s === undefined || s === null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');

// Normalised state name for a party, or null when it cannot be determined.
function stateOf(gstin, stateText) {
  const m = /^(\d{2})/.exec(String(gstin || '').trim());
  if (m && GST_STATE_CODES[m[1]]) return GST_STATE_CODES[m[1]];
  const t = normState(stateText);
  return t ? STATE_ALIASES[t] || t : null;
}

// Interstate = different states. An unknown state on either side counts as interstate, so the
// e-way rule errs on the side of requiring the number.
function isInterstate(vendor, company) {
  const a = stateOf(vendor && vendor.gst_number, vendor && vendor.state);
  const b = stateOf(company && company.gst_number, company && company.state);
  return !a || !b || a !== b;
}

// Express handler wrapper: HttpError -> its status, unique/foreign-key violations -> readable 409/400.
const wrap = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...(err.extra || {}) });
    if (err.code === '23505') {
      const c = String(err.constraint);
      if (c.includes('dc_number')) return res.status(409).json({ error: 'DC number already exists' });
      if (c.includes('job_work_item_id')) return res.status(409).json({ error: 'An item is already on another DC' });
      if (c.includes('lower_name')) return res.status(409).json({ error: 'A stock item with this name already exists' });
      if (c.includes('pending_name')) return res.status(409).json({ error: 'A request for this item is already pending' });
      if (c.includes('master_customers_company_name')) return res.status(409).json({ error: 'A customer with this name already exists' });
      if (c.includes('master_customers_company_gstin')) return res.status(409).json({ error: 'A customer with this GSTIN already exists' });
      if (c.includes('ejw_inwards_customer_dc')) return res.status(409).json({ error: 'This customer DC has already been received' });
      if (c.includes('ejw_dispatches_dc_no')) return res.status(409).json({ error: 'DC number already exists' });
      if (c.includes('ejw_dispatches_invoice_no')) return res.status(409).json({ error: 'Invoice number already exists' });
      return res.status(409).json({ error: 'Duplicate record' });
    }
    if (err.code === '23503') return res.status(400).json({ error: 'A referenced record does not exist' });
    console.error('jobwork error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  HttpError,
  wrap,
  GST_STATE_CODES,
  normState,
  stateOf,
  isInterstate,
  normRole,
  requireRole,
  withTransaction,
  recomputeRequestStatus,
  dcRequestIds,
  dcProjectIds,
  logHistory,
  notifyUser,
  notifyRole
};
