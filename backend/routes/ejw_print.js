// External Job Work v2 - printable documents. Mounted at /api/ejw.
//   GET /dispatches/:id/delivery-challan.pdf   component lines, no GST          (Accounts, Management, Store)
//   GET /dispatches/:id/tax-invoice.pdf        job charge + GST                 (Accounts, Management only)
// Only an issued (or cancelled, stamped CANCELLED) dispatch has numbers and can be printed. One template per document
// lives in backend/pdf/.

const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { HttpError, wrap, requireRole, GST_STATE_CODES, stateOf } = require('../utils/jobwork');
const challan = require('../pdf/deliveryChallan');
const invoice = require('../pdf/taxInvoice');

const router = express.Router();
router.use(authenticateToken);

async function loadPrintable(companyId, id) {
  const d = (await pool.query(
    `SELECT d.*, w.wo_no, w.customer_po_no, g.rate AS gst_rate
       FROM ejw_dispatches d JOIN work_orders w ON w.id = d.wo_id LEFT JOIN gst_rates g ON g.id = d.gst_rate_id
      WHERE d.id = $1 AND d.company_id = $2`, [id, companyId])).rows[0];
  if (!d) throw new HttpError(404, 'Dispatch not found');
  if (d.status === 'draft') throw new HttpError(400, 'A draft has no document numbers yet. Issue the dispatch first, then print.');
  const company = (await pool.query('SELECT name, address, gst_number, state FROM companies WHERE id = $1', [companyId])).rows[0];
  const customer = (await pool.query('SELECT name, gstin, billing_address, works_address, state FROM master_customers WHERE id = $1', [d.customer_id])).rows[0];
  const items = (await pool.query(
    `SELECT di.*, i.customer_dc_date FROM ejw_dispatch_items di JOIN ejw_inward_items it ON it.id = di.inward_item_id
       JOIN ejw_inwards i ON i.id = it.inward_id WHERE di.dispatch_id = $1 ORDER BY di.id`, [id])).rows;
  // our snapshot of the customer on the day of issue wins over the master record, which may have been edited since
  const snap = { ...customer, name: d.customer_name || customer.name, gstin: d.customer_gstin || customer.gstin, state: d.customer_state || customer.state,
    billing_address: d.customer_address || customer.billing_address };
  const refs = [...new Set(items.filter((i) => i.customer_dc_no).map((i) => `${i.customer_dc_no}${i.customer_dc_date ? ` dt. ${String(i.customer_dc_date).slice(0, 10).split('-').reverse().join('-')}` : ''}`))].join(', ');
  // older rows may have no stored place of supply: derive it from the customer GSTIN the same way issue does
  let { place_of_supply_state: posState, place_of_supply_code: posCode } = d;
  if (!posState) {
    const name = stateOf(snap.gstin, snap.state);
    if (name) {
      posState = name.replace(/\b\w/g, (c) => c.toUpperCase());
      posCode = Object.keys(GST_STATE_CODES).find((k) => GST_STATE_CODES[k] === name) || null;
    }
  }
  return { ...d, company, customer: snap, items, customer_dc_refs: refs, place_of_supply_state: posState, place_of_supply_code: posCode };
}

function sendPdf(res, buffer, filename) {
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${filename}"`, 'Content-Length': buffer.length });
  res.end(buffer);
}

const safe = (s) => String(s).replace(/[^A-Za-z0-9._-]+/g, '_');

router.get('/dispatches/:id(\\d+)/delivery-challan.pdf', requireRole('accountant', 'management', 'store_incharge'), wrap(async (req, res) => {
  const d = await loadPrintable(req.user.company_id, parseInt(req.params.id, 10));
  sendPdf(res, await challan.build(d), `DC_${safe(d.dc_no)}.pdf`);
}));

router.get('/dispatches/:id(\\d+)/tax-invoice.pdf', requireRole('accountant', 'management'), wrap(async (req, res) => {
  const d = await loadPrintable(req.user.company_id, parseInt(req.params.id, 10));
  sendPdf(res, await invoice.build(d), `Invoice_${safe(d.invoice_no)}.pdf`);
}));

module.exports = router;
