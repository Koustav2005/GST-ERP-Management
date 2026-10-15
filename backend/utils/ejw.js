// Shared pieces of External Job Work v2: validation, role-specific response shapes, work order creation.

const { HttpError, normRole, notifyUser, notifyRole, stateOf } = require('./jobwork');
const { nextNumber } = require('./numbering');

const MONEY_RE = /^\d+(\.\d{1,2})?$/;
const QTY_RE = /^\d+(\.\d{1,3})?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const EWAY_RE = /^\d{12}$/;

const text = (v) => (v === undefined || v === null ? '' : String(v).trim());

function requireInt(value, label) {
  const n = parseInt(value, 10);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `${label} is required`);
  return n;
}

// 'YYYY-MM-DD' that is a real calendar date; null when blank.
function optionalDate(value, label) {
  const v = text(value);
  if (!v) return null;
  const d = new Date(`${v}T00:00:00Z`);
  if (!DATE_RE.test(v) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
    throw new HttpError(400, `${label} must be a valid date (YYYY-MM-DD)`);
  }
  return v;
}

const todayStr = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// A received date cannot be in the future.
function receivedDate(value) {
  const v = optionalDate(value, 'received_date') || todayStr();
  if (v > todayStr()) throw new HttpError(400, 'received_date cannot be in the future');
  return v;
}

function ewayBill(value) {
  const v = text(value);
  if (v && !EWAY_RE.test(v)) throw new HttpError(400, 'E-way bill number must be exactly 12 digits');
  return v || null;
}

// ---- role-specific response shapes ----------------------------------------------------------------
// Store sees the component value but never job charges or invoice amounts. The PM (and NPD) see no money
// at all. Accounts and Management see everything. Applied to every response, recursively.
const COMPONENT_MONEY = ['unit_value', 'total_value', 'component_value', 'value', 'pending_value'];
const INVOICE_MONEY = ['job_charge', 'taxable_value', 'gst_rate_id', 'gst_amount', 'cgst_amount', 'sgst_amount', 'igst_amount', 'invoice_total', 'dispatch_total'];
const SEES_ALL = ['accountant', 'management', 'admin'];

function hiddenKeysFor(role) {
  const r = normRole(role);
  if (SEES_ALL.includes(r)) return [];
  if (r === 'store_incharge') return INVOICE_MONEY;
  return [...COMPONENT_MONEY, ...INVOICE_MONEY];
}

function strip(value, hidden) {
  if (Array.isArray(value)) return value.map((v) => strip(v, hidden));
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) if (!hidden.includes(k)) out[k] = strip(v, hidden);
    return out;
  }
  return value;
}

const shape = (role, payload) => strip(payload, hiddenKeysFor(role));
const send = (res, role, payload, status = 200) => res.status(status).json(shape(role, payload));

// ---- work orders ------------------------------------------------------------------------------------

async function logProjectHistory(client, projectId, userId, oldStatus, newStatus, notes) {
  if (!projectId) return;
  await client.query(
    'INSERT INTO project_status_history (project_id, old_status, new_status, changed_by, notes) VALUES ($1, $2, $3, $4, $5)',
    [projectId, oldStatus, newStatus, userId, notes]
  );
}

// Creates the work order (and, for scenarios S1/S2, its project). Call inside a transaction.
//   projectId   an existing project (S3: created at PO upload); omit to create one named after the WO number
//   itemIds     inward items to put on the work order
async function createWorkOrder(client, o) {
  const woNo = await nextNumber(client, o.companyId, 'WO');
  let projectId = o.projectId || null;
  if (!projectId) {
    const project = await client.query(
      `INSERT INTO projects (name, description, company_id, assigned_to, priority, status, created_by, project_type)
       VALUES ($1, $2, $3, $4, 'medium', 'pending', $5, 'external_job_work') RETURNING id`,
      [woNo, o.description || `External job work ${woNo}`, o.companyId, o.pmId || null, o.createdBy]
    );
    projectId = project.rows[0].id;
  }
  const wo = (await client.query(
    `INSERT INTO work_orders (company_id, wo_no, customer_id, project_id, enquiry_id, pm_id, source, status, description,
                              customer_po_no, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [o.companyId, woNo, o.customerId, projectId, o.enquiryId || null, o.pmId || null, o.source, o.status,
      o.description || null, o.customerPoNo || null, o.createdBy]
  )).rows[0];

  if (o.itemIds && o.itemIds.length) {
    await client.query('UPDATE ejw_inward_items SET wo_id = $1 WHERE id = ANY($2)', [wo.id, o.itemIds]);
  }
  if (o.poFile) {
    await client.query(
      "INSERT INTO work_order_documents (wo_id, kind, file_name, file_path, uploaded_by) VALUES ($1, 'customer_po', $2, $3, $4)",
      [wo.id, o.poFile.name, o.poFile.path, o.createdBy]
    );
  }
  await logProjectHistory(client, projectId, o.createdBy, null, o.status === 'awaiting_material' ? 'Awaiting material' : 'Work order created',
    `Work order ${woNo} created${o.source === 'enquiry' ? ' from the customer PO' : ' from customer material in stock'}`);
  return wo;
}

// When the project's assigned user changes, the work order's PM follows (only a project manager counts as PM).
async function syncWorkOrderPm(db, project) {
  const wo = (await db.query('SELECT id, wo_no, pm_id FROM work_orders WHERE project_id = $1', [project.id])).rows[0];
  if (!wo) return null;
  let pmId = null;
  if (project.assigned_to) {
    const u = await db.query('SELECT id, role FROM users WHERE id = $1 AND company_id = $2', [project.assigned_to, project.company_id]);
    if (u.rows.length && normRole(u.rows[0].role) === 'project_manager') pmId = u.rows[0].id;
  }
  await db.query('UPDATE work_orders SET pm_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [wo.id, pmId]);
  if (pmId && pmId !== wo.pm_id) {
    await notifyUser(db, pmId, 'External Job Assigned', `Work order ${wo.wo_no} has been assigned to you.`, 'ejw_wo_assigned', project.id, { wo_id: wo.id });
  }
  return { ...wo, pm_id: pmId };
}

// NPD who owns the enquiry behind an S3 work order.
async function npdOfWorkOrder(client, wo) {
  if (!wo.enquiry_id) return null;
  const r = await client.query('SELECT assigned_to FROM enquiries WHERE id = $1', [wo.enquiry_id]);
  return r.rows.length ? r.rows[0].assigned_to : null;
}

// ---- dispatch money: job charge + GST, and the e-way bill rule -----------------------------------------

const EWAY_THRESHOLD = 50000;

// E-way bill number needed when the dispatch total is above 50,000 OR the job work crosses a state border.
// The state of each party comes from its GSTIN (first two digits), falling back to the state text.
function ewayRequirementFor({ total, partyGstin, partyState, companyGstin, companyState }) {
  const party = stateOf(partyGstin, partyState);
  const company = stateOf(companyGstin, companyState);
  const reasons = [];
  if (Number(total) > EWAY_THRESHOLD) reasons.push(`The dispatch value ${total} is above ${EWAY_THRESHOLD}`);
  if (!party || !company) {
    reasons.push(`Interstate status unknown (customer state: ${party || 'not set'}, our state: ${company || 'not set'}); set the GSTIN or state`);
  } else if (party !== company) {
    reasons.push(`Interstate: the customer is in ${party}, we are in ${company}`);
  }
  return { required: reasons.length > 0, reasons, threshold: EWAY_THRESHOLD, customer_state: party, company_state: company };
}

// GST on the JOB CHARGE only (never on the component value). Customer in our state: CGST + SGST (SGST takes the odd
// paisa); otherwise IGST. Computed in SQL so the paise are exact. Refuses when either state is unknown.
async function jobChargeTax(client, companyId, party, taxable, gstRateId) {
  const rateRow = await client.query('SELECT id, rate FROM gst_rates WHERE id = $1 AND is_active', [gstRateId]);
  if (rateRow.rows.length === 0) throw new HttpError(400, 'Choose a GST rate for the job charge');
  const company = (await client.query('SELECT gst_number, state FROM companies WHERE id = $1', [companyId])).rows[0] || {};
  const partyState = stateOf(party.gstin, party.state);
  const companyState = stateOf(company.gst_number, company.state);
  if (!partyState || !companyState) {
    throw new HttpError(400, 'Set the GSTIN (or state) of the customer and of the company first: they decide CGST+SGST vs IGST');
  }
  const intra = partyState === companyState;
  const { rows } = await client.query(
    `SELECT g.gst::numeric(14,2) AS gst,
            (CASE WHEN $3::boolean THEN ROUND(g.gst / 2, 2) ELSE 0 END)::numeric(14,2) AS cgst,
            (CASE WHEN $3::boolean THEN g.gst - ROUND(g.gst / 2, 2) ELSE 0 END)::numeric(14,2) AS sgst,
            (CASE WHEN $3::boolean THEN 0 ELSE g.gst END)::numeric(14,2) AS igst,
            ($1::numeric + g.gst)::numeric(14,2) AS invoice_total
       FROM (SELECT ROUND($1::numeric * $2::numeric / 100, 2) AS gst) g`,
    [taxable, rateRow.rows[0].rate, intra]
  );
  return { gst_rate_id: rateRow.rows[0].id, gst_rate: rateRow.rows[0].rate, split: intra ? 'CGST_SGST' : 'IGST', ...rows[0] };
}

// ---- acknowledgment to the customer (scenario S2) ----------------------------------------------------

const inr = (v) => `Rs ${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dmy = (v) => {
  const s = text(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s.slice(8, 10)}-${s.slice(5, 7)}-${s.slice(0, 4)}` : null;
};
const qtyText = (q) => String(Number(q));

function buildAcknowledgment({ inward, customer, items, companyName }) {
  const when = dmy(inward.supplier_dc_date);
  const list = items.map((i) => `${i.description} (${qtyText(i.qty)} ${i.unit})`).join('; ');
  const total = items.reduce((sum, i) => sum + Math.round(Number(i.total_value) * 100), 0) / 100;
  const subject = `Material received on your behalf: ${inward.inward_no}`;
  const body =
`Dear ${customer.name},

We have received your component from ${inward.supplier_name} vide DC no. ${inward.supplier_dc_no || '(not stated)'}${when ? ` dated ${when}` : ''}: ${list}. Declared value ${inr(total)}.
Our inward reference is ${inward.inward_no}.

Please send us your PO and your own delivery challan / RGP for this material.

Regards,
${companyName}`;
  const to = customer.email || '';
  const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { to: to || null, subject, body, mailto, total_value: total.toFixed(2) };
}

module.exports = {
  MONEY_RE, QTY_RE, GSTIN_RE, EWAY_RE, text, requireInt, optionalDate, receivedDate, ewayBill, todayStr,
  shape, send, EWAY_THRESHOLD, ewayRequirementFor, jobChargeTax, createWorkOrder, syncWorkOrderPm, npdOfWorkOrder, logProjectHistory, buildAcknowledgment, dmy,
  notifyUser, notifyRole
};
