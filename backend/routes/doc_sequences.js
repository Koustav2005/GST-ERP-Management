// Document number series (DC, IN, WO, INV): what they look like, where they are, and the one setting
// "restart every financial year (April)". Mounted at /api/doc-sequences.
// Numbers themselves are only ever handed out by utils/numbering.js inside the issuing transaction.

const express = require('express');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { HttpError, wrap, requireRole, withTransaction } = require('../utils/jobwork');
const { SERIES, lockSeries, peekNumber } = require('../utils/numbering');

const router = express.Router();
router.use(authenticateToken);

const LABELS = { DC: 'Delivery challan', IN: 'Customer material inward', WO: 'Work order', INV: 'Tax invoice' };

async function describe(client, companyId) {
  const { rows } = await client.query('SELECT * FROM doc_sequences WHERE company_id = $1', [companyId]);
  const byName = new Map(rows.map((r) => [r.series, r]));
  const out = [];
  for (const series of Object.keys(SERIES)) {
    const row = byName.get(series);
    out.push({
      series,
      label: LABELS[series],
      prefix: SERIES[series].prefix,
      max_length: SERIES[series].maxLength,
      reset_yearly: row ? row.reset_yearly : SERIES[series].resetYearly,
      number_source: row ? row.number_source : 'app',
      can_be_manual: series === 'DC' || series === 'INV',
      financial_year: row ? row.fy_label : null,
      last_value: row ? row.last_value : 0,
      next_number: await peekNumber(client, companyId, series)
    });
  }
  return out;
}

router.get('/', requireRole('accountant', 'management'), wrap(async (req, res) => {
  res.json({ sequences: await describe(pool, req.user.company_id) });
}));

// Only management changes these settings:
//   reset_yearly   restart the counter every financial year (April)
//   number_source  'app' (automatic, a typed number is still accepted) or 'manual' (numbers come from Tally and
//                  must be typed); DC and INV only
router.put('/:series', requireRole('management'), wrap(async (req, res) => {
  const series = String(req.params.series).toUpperCase();
  if (!SERIES[series]) throw new HttpError(404, 'Unknown series');
  const body = req.body || {};
  const hasReset = body.reset_yearly !== undefined;
  const hasSource = body.number_source !== undefined;
  if (!hasReset && !hasSource) throw new HttpError(400, 'Nothing to change: send reset_yearly and/or number_source');
  if (hasReset && typeof body.reset_yearly !== 'boolean') throw new HttpError(400, 'reset_yearly must be true or false');
  if (hasSource) {
    if (!['app', 'manual'].includes(body.number_source)) throw new HttpError(400, "number_source must be 'app' or 'manual'");
    if (body.number_source === 'manual' && series !== 'DC' && series !== 'INV') {
      throw new HttpError(400, 'Only DC and invoice numbers can be entered manually (from Tally)');
    }
  }
  const sequences = await withTransaction(async (client) => {
    await lockSeries(client, req.user.company_id, series);
    if (hasReset) {
      await client.query('UPDATE doc_sequences SET reset_yearly = $3, updated_at = CURRENT_TIMESTAMP WHERE company_id = $1 AND series = $2', [req.user.company_id, series, body.reset_yearly]);
    }
    if (hasSource) {
      await client.query('UPDATE doc_sequences SET number_source = $3, updated_at = CURRENT_TIMESTAMP WHERE company_id = $1 AND series = $2', [req.user.company_id, series, body.number_source]);
    }
    return describe(client, req.user.company_id);
  });
  res.json({ sequences });
}));

module.exports = router;
