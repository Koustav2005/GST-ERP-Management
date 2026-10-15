// Pure helper (no React Native imports) so the backend test script can check the exact rule.

export const normHsn = (h) => String(h === undefined || h === null ? '' : h).replace(/\s+/g, '').toUpperCase();

// True when the PM's HSN and the stock item's HSN are both present and clearly different.
// HSN codes come in 2, 4, 6 or 8 digits, so one being the longer form of the other (7308 vs
// 73089090) is not a mismatch. A missing HSN on either side never warns.
export function hsnMismatch(pmHsn, stockHsn) {
  const a = normHsn(pmHsn);
  const b = normHsn(stockHsn);
  if (!a || !b) return false;
  return !(a.startsWith(b) || b.startsWith(a));
}

export function hsnWarning(pmHsn, stockHsn) {
  return hsnMismatch(pmHsn, stockHsn)
    ? `HSN differs: the PM entered ${String(pmHsn).trim()}, the stock item has ${String(stockHsn).trim()}. You can still continue.`
    : '';
}
