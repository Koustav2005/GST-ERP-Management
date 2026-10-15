import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { jobworkDcsAPI } from '../../config/api';
import { apiErrorMessage } from '../../utils/jobwork';
import { gstSplitParts } from '../../utils/gstSplit';
import { COLORS, ErrorBanner } from './common';

// One-line GST split for any row that has job_charge, gst_rate, cgst/sgst/igst_amount and total.
// Used by the live preview, the DC detail screen and the Accountant's invoice list.
export function GstSplitLine({ row, style }) {
  const parts = gstSplitParts(row);
  if (!parts) return <Text style={[{ color: COLORS.muted, fontSize: 13 }, style]}>No job charge</Text>;
  return <Text style={[{ fontSize: 13, fontWeight: '600', color: '#1C1C1E', lineHeight: 20 }, style]}>{parts.join(' | ')}</Text>;
}

// Shown pinned above the buttons of Record return / Record vendor invoice, so it is never
// scrolled out of sight. The numbers come from the server (same code that saves the row);
// nothing is calculated here. Every state of the form says what it is waiting for.
export default function TaxPreview({ vendorId, jobCharge, gstRateId }) {
  const [state, setState] = useState({ loading: false, data: null, error: '' });
  const charge = String(jobCharge || '').trim();
  const hasCharge = Number(charge) > 0;

  useEffect(() => {
    if (!hasCharge || !vendorId || !gstRateId) {
      setState({ loading: false, data: null, error: '' });
      return undefined;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: '' }));
    const timer = setTimeout(async () => {
      try {
        const res = await jobworkDcsAPI.taxPreview({ vendor_id: vendorId, job_charge: charge, gst_rate_id: gstRateId });
        if (!cancelled) setState({ loading: false, data: res.data, error: '' });
      } catch (e) {
        if (!cancelled) setState({ loading: false, data: null, error: apiErrorMessage(e, 'Could not calculate the tax.') });
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [vendorId, charge, gstRateId, hasCharge]);

  if (!hasCharge) return null;
  const waiting = !vendorId ? 'Choose the vendor' : !gstRateId ? 'Choose a GST rate' : '';
  if (waiting) {
    return <ErrorBanner kind="warning" message={`${waiting} to see the CGST / SGST / IGST split.`} />;
  }
  if (state.error) return <ErrorBanner message={`Tax split unavailable: ${state.error}`} />;
  if (state.loading || !state.data) {
    return <View style={{ paddingVertical: 8 }}><ActivityIndicator size="small" color={COLORS.primary} /></View>;
  }
  const d = state.data;
  return (
    <View style={{ borderWidth: 1, borderColor: COLORS.primary, backgroundColor: '#F2F8FF', borderRadius: 8, padding: 10, marginTop: 8 }}>
      <Text style={{ fontSize: 12, color: COLORS.muted, marginBottom: 2 }}>
        {d.split === 'IGST' ? 'Interstate: IGST' : 'Same state: CGST + SGST'} (calculated by the server)
      </Text>
      <GstSplitLine row={d} />
    </View>
  );
}
