// Customer master for External Job Work v2: the owners of the material we process.
// Mounted at /api/master-customers. Management and Accounts maintain it; Store, PM and NPD can read it
// (pickers). Everything is scoped to the caller's company.

const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { HttpError, wrap, requireRole, GST_STATE_CODES, stateOf } = require('../utils/jobwork');

const router = express.Router();
router.use(authenticateToken);

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const READ_ROLES = ['accountant', 'management', 'store_incharge', 'project_manager', 'npd'];
const WRITE_ROLES = ['accountant', 'management'];

const text = (v) => (v === undefined || v === null ? '' : String(v).trim());
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

// Validate a body (create: all fields; update: only the ones present) and return the columns to write.
function clean(body, { partial }) {
  const out = {};
  const has = (k) => body[k] !== undefined;

  if (!partial || has('name')) {
    const name = text(body.name);
    if (!name) throw new HttpError(400, 'name is required');
    if (name.length > 255) throw new HttpError(400, 'name is too long');
    out.name = name;
  }
  if (!partial || has('gstin')) {
    const gstin = text(body.gstin).toUpperCase();
    if (gstin) {
      if (!GSTIN_RE.test(gstin)) throw new HttpError(400, 'GSTIN must be 15 characters in the GST format (e.g. 29ABCDE1234F1Z5)');
      if (!GST_STATE_CODES[gstin.slice(0, 2)]) throw new HttpError(400, `GSTIN starts with ${gstin.slice(0, 2)}, which is not a GST state code`);
    }
    out.gstin = gstin || null;
  }
  for (const [key, max] of [['billing_address', 1000], ['works_address', 1000], ['phone', 30]]) {
    if (!partial || has(key)) {
      const v = text(body[key]);
      if (v.length > max) throw new HttpError(400, `${key} is too long`);
      out[key] = v || null;
    }
  }
  if (!partial || has('email')) {
    const email = text(body.email);
    if (email && !EMAIL_RE.test(email)) throw new HttpError(400, 'email is not valid');
    out.email = email || null;
  }
  if (!partial || has('state')) {
    const state = text(body.state);
    if (state.length > 100) throw new HttpError(400, 'state is too long');
    out.state = state || null;
  }
  if (has('is_active')) out.is_active = body.is_active === true || body.is_active === 'true';

  // The GSTIN decides the state (its first two digits), exactly as the tax and e-way rules read it.
  if (out.gstin) out.state = titleCase(stateOf(out.gstin, out.state));
  return out;
}

router.get('/', requireRole(...READ_ROLES), wrap(async (req, res) => {
  const search = text(req.query.search);
  const includeInactive = req.query.include_inactive === '1' || req.query.include_inactive === 'true';
  const { rows } = await pool.query(
    `SELECT * FROM master_customers
      WHERE company_id = $1 AND ($2::boolean OR is_active)
        AND ($3 = '' OR name ILIKE '%' || $3 || '%' OR gstin ILIKE '%' || $3 || '%')
      ORDER BY LOWER(name) LIMIT 500`,
    [req.user.company_id, includeInactive, search]
  );
  res.json({ customers: rows });
}));

router.get('/:id(\\d+)', requireRole(...READ_ROLES), wrap(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM master_customers WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
  if (rows.length === 0) throw new HttpError(404, 'Customer not found');
  res.json({ customer: rows[0] });
}));

router.post('/', requireRole(...WRITE_ROLES), wrap(async (req, res) => {
  const c = clean(req.body || {}, { partial: false });
  const { rows } = await pool.query(
    `INSERT INTO master_customers (company_id, name, gstin, billing_address, works_address, state, email, phone, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [req.user.company_id, c.name, c.gstin, c.billing_address, c.works_address, c.state, c.email, c.phone, req.user.id]
  );
  res.status(201).json({ customer: rows[0] });
}));

router.put('/:id(\\d+)', requireRole(...WRITE_ROLES), wrap(async (req, res) => {
  const c = clean(req.body || {}, { partial: true });
  const keys = Object.keys(c);
  if (keys.length === 0) throw new HttpError(400, 'Nothing to update');
  const values = keys.map((k) => c[k]);
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).concat('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.id, req.user.company_id);
  const { rows } = await pool.query(
    `UPDATE master_customers SET ${sets.join(', ')} WHERE id = $${values.length - 1} AND company_id = $${values.length} RETURNING *`,
    values
  );
  if (rows.length === 0) throw new HttpError(404, 'Customer not found');
  res.json({ customer: rows[0] });
}));

// A customer that has material, work orders or enquiries cannot be deleted: deactivate it instead.
router.delete('/:id(\\d+)', requireRole(...WRITE_ROLES), wrap(async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM master_customers WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
    if (rowCount === 0) throw new HttpError(404, 'Customer not found');
    res.json({ deleted: true });
  } catch (err) {
    if (err.code === '23503') throw new HttpError(409, 'This customer is in use (material, work orders or enquiries). Deactivate it instead.');
    throw err;
  }
}));

module.exports = router;
