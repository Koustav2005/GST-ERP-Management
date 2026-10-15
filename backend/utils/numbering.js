// Document numbering for delivery challans, inwards, work orders and tax invoices.
//
//  DC   SE/DC/0001         one series for ALL outgoing delivery challans (internal and external), continuous
//  IN   SE/IN/0001         customer material inwards, continuous
//  WO   SE/WO/0001         work orders, continuous
//  INV  SE/INV/2627/0001   tax invoices: financial year 2026-27, restarts every April, 9,999 a year,
//                          always 16 characters (the GST limit)
//
// A number is allocated INSIDE the caller's transaction while holding a row lock on doc_sequences, so two
// users never get the same number and a document that is rolled back leaves no gap. Cancelled documents keep
// their numbers; a number is never reused.
//
// DC and INV can also be TYPED (Accounts copies the number from Tally). Per company, doc_sequences.number_source
// says whether that is optional ('app': auto unless a number is typed) or compulsory ('manual': Tally is the
// source and the app never invents a DC / invoice number).

const { HttpError } = require('./jobwork');

const SERIES = {
  DC: { label: 'DC', prefix: 'SE/DC/', pad: 4, resetYearly: false, maxLength: 16 },
  IN: { label: 'Inward', prefix: 'SE/IN/', pad: 4, resetYearly: false, maxLength: 30 },
  WO: { label: 'Work order', prefix: 'SE/WO/', pad: 4, resetYearly: false, maxLength: 30 },
  INV: { label: 'Invoice', prefix: 'SE/INV/', pad: 4, resetYearly: true, maxLength: 16 }
};

// The GST rule for invoice / challan numbers: at most 16 characters, letters, digits, '/' and '-' only.
const TYPED_NUMBER_RE = /^[A-Za-z0-9/-]+$/;

const pad2 = (n) => String(n).padStart(2, '0');

// Indian financial year: April to March. date: 'YYYY-MM-DD', Date, or omitted for today.
// label is the 4-digit form used in invoice numbers: 2026-27 -> '2627'.
function financialYear(date) {
  let y;
  let m;
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    y = parseInt(date.slice(0, 4), 10);
    m = parseInt(date.slice(5, 7), 10);
  } else {
    const d = date instanceof Date ? date : new Date();
    y = d.getFullYear();
    m = d.getMonth() + 1;
  }
  const start = m >= 4 ? y : y - 1;
  return { start, label: `${pad2(start % 100)}${pad2((start + 1) % 100)}` };
}

const fyStartOfLabel = (label) => 2000 + parseInt(String(label).slice(0, 2), 10);

function configFor(series) {
  const cfg = SERIES[series];
  if (!cfg) throw new Error(`Unknown document series: ${series}`);
  return cfg;
}

function format(series, value, fyLabel) {
  const cfg = configFor(series);
  const number = `${cfg.prefix}${fyLabel ? `${fyLabel}/` : ''}${String(value).padStart(cfg.pad, '0')}`;
  if (number.length > cfg.maxLength) {
    throw new HttpError(400, `The ${series} series is full: "${number}" would be longer than ${cfg.maxLength} characters`);
  }
  return number;
}

// Make sure the (company, series) row exists and lock it until the transaction ends.
async function lockSeries(client, companyId, series) {
  const cfg = configFor(series);
  await client.query(
    `INSERT INTO doc_sequences (company_id, series, reset_yearly) VALUES ($1, $2, $3) ON CONFLICT (company_id, series) DO NOTHING`,
    [companyId, series, cfg.resetYearly]
  );
  const { rows } = await client.query('SELECT * FROM doc_sequences WHERE company_id = $1 AND series = $2 FOR UPDATE', [companyId, series]);
  return rows[0];
}

// Where a number might already exist (manual DC numbers, imports), checked before it is handed out.
async function isTaken(client, companyId, series, number, fyLabel) {
  const queries = {
    DC: [
      ['SELECT 1 FROM jobwork_dcs WHERE company_id = $1 AND dc_number = $2', [companyId, number]],
      ['SELECT 1 FROM ejw_dispatches WHERE company_id = $1 AND dc_no = $2', [companyId, number]]
    ],
    IN: [['SELECT 1 FROM ejw_inwards WHERE company_id = $1 AND inward_no = $2', [companyId, number]]],
    WO: [['SELECT 1 FROM work_orders WHERE company_id = $1 AND wo_no = $2', [companyId, number]]],
    // invoice numbers are unique within a financial year (Tally restarts every April)
    INV: [['SELECT 1 FROM ejw_dispatches WHERE company_id = $1 AND invoice_no = $2 AND invoice_fy = $3', [companyId, number, fyLabel]]]
  }[series];
  for (const [sql, params] of queries) {
    const { rowCount } = await client.query(sql, params);
    if (rowCount) return true;
  }
  return false;
}

// The next number in a series. date matters only for yearly series: the document's date decides the year.
async function nextNumber(client, companyId, series, { date } = {}) {
  const row = await lockSeries(client, companyId, series);
  let last = row.last_value;
  let fyLabel = row.fy_label;
  const fy = financialYear(date);

  if (row.reset_yearly) {
    if (!fyLabel || fyStartOfLabel(fyLabel) < fy.start) {
      last = 0;               // a new financial year starts again from 1
      fyLabel = fy.label;
    } else if (fyStartOfLabel(fyLabel) > fy.start) {
      throw new HttpError(400, `A ${series} number cannot be issued for FY ${fy.label}: the series has already moved on to ${fyLabel}`);
    }
  }

  // Skip numbers already used elsewhere (a typed number, say), so an auto number never collides.
  for (let attempt = 0; attempt < 100; attempt += 1) {
    last += 1;
    const number = format(series, last, row.reset_yearly ? fyLabel : null);
    if (!(await isTaken(client, companyId, series, number, fyLabel))) {
      await client.query(
        'UPDATE doc_sequences SET last_value = $3, fy_label = $4, updated_at = CURRENT_TIMESTAMP WHERE company_id = $1 AND series = $2',
        [companyId, series, last, fyLabel]
      );
      return number;
    }
  }
  throw new HttpError(500, `Could not find a free ${series} number`);
}

// What the next number would be, without using it (for display; not reserved).
async function peekNumber(client, companyId, series, { date } = {}) {
  const cfg = configFor(series);
  const { rows } = await client.query('SELECT * FROM doc_sequences WHERE company_id = $1 AND series = $2', [companyId, series]);
  const row = rows[0] || { last_value: 0, reset_yearly: cfg.resetYearly, fy_label: null };
  let last = row.last_value;
  let fyLabel = row.fy_label;
  if (row.reset_yearly) {
    const fy = financialYear(date);
    if (!fyLabel || fyStartOfLabel(fyLabel) < fy.start) {
      last = 0;
      fyLabel = fy.label;
    }
  }
  return format(series, last + 1, row.reset_yearly ? fyLabel : null);
}

// A hand-typed DC number must be free in BOTH DC tables. Locks the DC series so two people typing the
// same number cannot both pass the check. excludeDcId: the internal DC being edited.
async function assertDcNumberFree(client, companyId, number, { excludeDcId = null } = {}) {
  await lockSeries(client, companyId, 'DC');
  const internal = await client.query(
    'SELECT 1 FROM jobwork_dcs WHERE company_id = $1 AND dc_number = $2 AND ($3::int IS NULL OR id <> $3)',
    [companyId, number, excludeDcId]
  );
  const external = await client.query('SELECT 1 FROM ejw_dispatches WHERE company_id = $1 AND dc_no = $2', [companyId, number]);
  if (internal.rowCount || external.rowCount) throw new HttpError(409, 'DC number already exists');
}

// The number for a new DC or invoice, typed or automatic.
//   typed        what the user entered (may be empty)
//   date         the document date (decides the financial year of an invoice)
//   maxLength    length limit for a typed number (16 for invoices and external DCs, the GST rule)
// Returns { number, fy, manual }. fy is the 4-digit financial year label (use it for invoice_fy).
async function resolveNumber(client, companyId, series, { typed, date, maxLength } = {}) {
  if (series !== 'DC' && series !== 'INV') throw new Error('Only DC and INV numbers can be typed');
  const cfg = configFor(series);
  const row = await lockSeries(client, companyId, series);
  const fy = financialYear(date).label;
  const entered = String(typed === undefined || typed === null ? '' : typed).trim();

  if (!entered) {
    if (row.number_source === 'manual') {
      throw new HttpError(400, `${cfg.label} number is required: this company enters ${series === 'DC' ? 'DC' : 'invoice'} numbers from Tally`);
    }
    return { number: await nextNumber(client, companyId, series, { date }), fy, manual: false };
  }

  const limit = maxLength || cfg.maxLength;
  if (entered.length > limit) throw new HttpError(400, `${cfg.label} number must be at most ${limit} characters`);
  if (series === 'INV' || limit <= 16) {
    if (!TYPED_NUMBER_RE.test(entered)) throw new HttpError(400, `${cfg.label} number may only contain letters, digits, "/" and "-"`);
  }
  if (series === 'DC') {
    await assertDcNumberFree(client, companyId, entered);
  } else if (await isTaken(client, companyId, 'INV', entered, fy)) {
    throw new HttpError(409, `Invoice number ${entered} is already used in FY ${fy}`);
  }
  return { number: entered, fy, manual: true };
}

module.exports = { SERIES, financialYear, format, lockSeries, nextNumber, peekNumber, assertDcNumberFree, resolveNumber };
