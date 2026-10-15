// External Job Work v2 - reports. Mounted at /api/ejw/reports.
// Every response goes through E.send, so Store sees only the component value and the PM sees no money.

const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { HttpError, wrap, requireRole } = require('../utils/jobwork');
const E = require('../utils/ejw');

const router = express.Router();
router.use(authenticateToken);
const { text } = E;
const ALL = ['accountant', 'management', 'store_incharge', 'project_manager', 'npd'];

const customerFilter = (q) => parseInt(q.customer_id, 10) || null;

// Material inside the factory right now: received, not yet returned or written off.
router.get('/material-inside', requireRole(...ALL), wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.id AS customer_id, c.name AS customer_name, i.inward_no, i.customer_dc_no, i.customer_dc_date, r.received_date,
            (CURRENT_DATE - r.received_date) AS days_held, w.wo_no, it.id AS item_id, it.description, it.hsn, it.unit,
            it.qty, it.issued_qty, it.ready_qty, it.returned_qty, it.short_closed_qty,
            (it.qty - it.returned_qty - it.short_closed_qty) AS inside_qty,
            ROUND((it.qty - it.returned_qty - it.short_closed_qty) * it.unit_value, 2) AS pending_value
       FROM ejw_inward_items it
       JOIN ejw_inwards i ON i.id = it.inward_id
       JOIN master_customers c ON c.id = i.customer_id
       JOIN ejw_inward_receipts r ON r.id = it.receipt_id
       LEFT JOIN work_orders w ON w.id = it.wo_id
      WHERE i.company_id = $1 AND ($2::int IS NULL OR c.id = $2) AND (it.qty - it.returned_qty - it.short_closed_qty) > 0
      ORDER BY LOWER(c.name), r.received_date, it.id`,
    [req.user.company_id, customerFilter(req.query)]
  );
  E.send(res, req.user.role, { rows });
}));

// What was inside the factory at the end of a given day: received up to then, minus what had gone back or been
// written off by then. A dispatch cancelled later still counts as gone on the days it was out.
router.get('/stock-as-of', requireRole(...ALL), wrap(async (req, res) => {
  const date = E.optionalDate(req.query.date, 'date');
  if (!date) throw new HttpError(400, 'date is required (YYYY-MM-DD)');
  const { rows } = await pool.query(
    `SELECT * FROM (
       SELECT c.id AS customer_id, c.name AS customer_name, i.inward_no, i.customer_dc_no, it.id AS item_id, it.description, it.hsn, it.unit,
              it.qty AS received_qty,
              COALESCE((SELECT SUM(di.qty) FROM ejw_dispatch_items di JOIN ejw_dispatches d ON d.id = di.dispatch_id
                         WHERE di.inward_item_id = it.id AND d.status IN ('issued', 'cancelled') AND d.dc_date <= $2::date
                           AND (d.status = 'issued' OR d.cancelled_at::date > $2::date)), 0) AS returned_by_date,
              COALESCE((SELECT SUM(s.qty) FROM ejw_short_closes s WHERE s.inward_item_id = it.id AND s.created_at::date <= $2::date), 0) AS short_closed_by_date,
              it.unit_value
         FROM ejw_inward_items it
         JOIN ejw_inwards i ON i.id = it.inward_id
         JOIN master_customers c ON c.id = i.customer_id
         JOIN ejw_inward_receipts r ON r.id = it.receipt_id
        WHERE i.company_id = $1 AND ($3::int IS NULL OR c.id = $3) AND r.received_date <= $2::date
     ) x
     WHERE received_qty - returned_by_date - short_closed_by_date > 0
     ORDER BY LOWER(customer_name), item_id`,
    [req.user.company_id, date, customerFilter(req.query)]
  );
  const out = rows.map((r) => {
    const inside = Math.round((Number(r.received_qty) - Number(r.returned_by_date) - Number(r.short_closed_by_date)) * 1000) / 1000;
    return { ...r, inside_qty: inside, pending_value: (Math.round(inside * Number(r.unit_value) * 100) / 100).toFixed(2) };
  });
  E.send(res, req.user.role, { as_of: date, rows: out });
}));

// Customer DCs that still have material open, and those whose DC number has not been attached yet.
router.get('/open-customer-dcs', requireRole(...ALL), wrap(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.id AS customer_id, c.name AS customer_name, i.id AS inward_id, i.inward_no, i.customer_dc_no, i.customer_dc_date, i.third_party,
            (NULLIF(BTRIM(i.customer_dc_no), '') IS NULL) AS customer_dc_pending, MIN(r.received_date) AS received_date,
            (CURRENT_DATE - MIN(r.received_date)) AS days_open, COUNT(*)::int AS open_items,
            SUM(it.qty - it.returned_qty - it.short_closed_qty) AS open_qty,
            SUM(ROUND((it.qty - it.returned_qty - it.short_closed_qty) * it.unit_value, 2)) AS pending_value
       FROM ejw_inwards i
       JOIN master_customers c ON c.id = i.customer_id
       JOIN ejw_inward_items it ON it.inward_id = i.id
       JOIN ejw_inward_receipts r ON r.id = it.receipt_id
      WHERE i.company_id = $1 AND ($2::int IS NULL OR c.id = $2) AND (it.qty - it.returned_qty - it.short_closed_qty) > 0
      GROUP BY c.id, c.name, i.id
      ORDER BY LOWER(c.name), i.id`,
    [req.user.company_id, customerFilter(req.query)]
  );
  E.send(res, req.user.role, { rows });
}));

// Work orders and how far each has got.
router.get('/work-orders', requireRole(...ALL), wrap(async (req, res) => {
  const status = text(req.query.status);
  const { rows } = await pool.query(
    `SELECT w.id, w.wo_no, w.status, w.customer_po_no, c.name AS customer_name, u.name AS pm_name, w.created_at, w.closed_at,
            COUNT(it.id)::int AS item_count, COALESCE(SUM(it.qty), 0) AS qty, COALESCE(SUM(it.issued_qty), 0) AS issued_qty,
            COALESCE(SUM(it.ready_qty), 0) AS ready_qty, COALESCE(SUM(it.returned_qty), 0) AS returned_qty,
            COALESCE(SUM(it.short_closed_qty), 0) AS short_closed_qty,
            COALESCE(SUM(ROUND((it.qty - it.returned_qty - it.short_closed_qty) * it.unit_value, 2)), 0) AS pending_value
       FROM work_orders w
       JOIN master_customers c ON c.id = w.customer_id
       LEFT JOIN users u ON u.id = w.pm_id
       LEFT JOIN ejw_inward_items it ON it.wo_id = w.id
      WHERE w.company_id = $1 AND ($2 = '' OR w.status = $2) AND ($3::int IS NULL OR w.customer_id = $3)
        AND ($4::int IS NULL OR w.pm_id = $4)
      GROUP BY w.id, c.name, u.name
      ORDER BY w.id DESC`,
    [req.user.company_id, status, customerFilter(req.query), req.user.role === 'project_manager' ? req.user.id : null]
  );
  E.send(res, req.user.role, { rows });
}));

// Tax invoices with the GST split. Money for Accounts and Management only.
router.get('/invoices', requireRole('accountant', 'management'), wrap(async (req, res) => {
  const from = E.optionalDate(req.query.from, 'from');
  const to = E.optionalDate(req.query.to, 'to');
  const { rows } = await pool.query(
    `SELECT d.id AS dispatch_id, d.invoice_no, d.invoice_date, d.status, d.dc_no, d.dc_date, w.wo_no, d.customer_name, d.customer_gstin,
            d.sac_code, d.taxable_value, g.rate AS gst_rate, d.cgst_amount, d.sgst_amount, d.igst_amount, d.gst_amount, d.invoice_total,
            d.component_value, d.dispatch_total, d.eway_bill_no, d.cancel_reason
       FROM ejw_dispatches d JOIN work_orders w ON w.id = d.wo_id LEFT JOIN gst_rates g ON g.id = d.gst_rate_id
      WHERE d.company_id = $1 AND d.status IN ('issued', 'cancelled') AND ($2::date IS NULL OR d.invoice_date >= $2) AND ($3::date IS NULL OR d.invoice_date <= $3)
      ORDER BY d.invoice_date, d.invoice_no`,
    [req.user.company_id, from, to]
  );
  const live = rows.filter((r) => r.status === 'issued');
  const sum = (key) => (live.reduce((s, r) => s + Math.round(Number(r[key]) * 100), 0) / 100).toFixed(2);
  E.send(res, req.user.role, {
    rows,
    totals: { taxable_value: sum('taxable_value'), cgst_amount: sum('cgst_amount'), sgst_amount: sum('sgst_amount'), igst_amount: sum('igst_amount'), gst_amount: sum('gst_amount'), invoice_total: sum('invoice_total') }
  });
}));

module.exports = router;
