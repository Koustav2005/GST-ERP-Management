// Pure helpers (no React Native imports) so the exact text the screens show can also be
// checked from the backend test script.

export function formatRs(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  const whole = Math.abs(n - Math.round(n)) < 1e-9;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

const pct = (rate) => {
  const n = Number(rate);
  return Number.isFinite(n) ? String(n) : '?';
};

// Parts of the GST line for a preview, a saved return or a saved vendor invoice.
// Needs: job_charge, gst_rate, cgst_amount, sgst_amount, igst_amount, total.
// Returns null when there is no job charge (nothing to split).
export function gstSplitParts(row) {
  if (!row || !(Number(row.job_charge) > 0)) return null;
  const parts = [`Taxable ${formatRs(row.job_charge)}`];
  if (Number(row.igst_amount) > 0) {
    parts.push(`IGST ${pct(row.gst_rate)}% ${formatRs(row.igst_amount)}`);
  } else if (Number(row.cgst_amount) > 0 || Number(row.sgst_amount) > 0) {
    const half = Number(row.gst_rate) / 2;
    parts.push(`CGST ${pct(half)}% ${formatRs(row.cgst_amount)}`);
    parts.push(`SGST ${pct(half)}% ${formatRs(row.sgst_amount)}`);
  } else {
    parts.push(`GST ${pct(row.gst_rate)}% ${formatRs(0)}`);
  }
  parts.push(`Total ${formatRs(row.total)}`);
  return parts;
}

export function gstSplitText(row) {
  const parts = gstSplitParts(row);
  return parts ? parts.join(' | ') : 'No job charge';
}
