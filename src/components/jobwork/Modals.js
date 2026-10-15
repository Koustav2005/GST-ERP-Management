import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { jobworkDcsAPI } from '../../config/api';
import { apiErrorMessage, cleanDecimal, isDate, today } from '../../utils/jobwork';
import { ActionModal, Button, ErrorBanner, Field, styles } from './common';
import { GstRatePicker, VendorPicker, useGstRates } from './Pickers';
import TaxPreview from './TaxPreview';
import DateField from './DateField';

function Footer({ onClose, onSubmit, submitLabel, busy, kind = 'primary' }) {
  return (
    <>
      <Button title="Cancel" kind="ghost" onPress={onClose} disabled={busy} />
      <Button title={submitLabel} kind={kind} onPress={onSubmit} loading={busy} />
    </>
  );
}

// Run an API call with busy/error handling shared by every modal.
function useSubmit(onDone) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (fn) => {
    setError('');
    setBusy(true);
    try {
      onDone(await fn());
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

export function ApproveModal({ visible, dc, onClose, onDone }) {
  const [eway, setEway] = useState('');
  const { busy, error, setError, run } = useSubmit(onDone);
  useEffect(() => { if (visible) { setEway(''); setError(''); } }, [visible]);
  const req = dc && dc.eway_requirement;

  const submit = () => {
    if (req && req.required && !eway) return setError('E-way bill number is required for this DC.');
    if (eway && !/^\d{12}$/.test(eway)) return setError('E-way bill number must be exactly 12 digits.');
    return run(async () => (await jobworkDcsAPI.approve(dc.id, { eway_bill_no: eway || undefined })).data);
  };

  return (
    <ActionModal visible={visible} title="Approve delivery challan" subtitle={dc ? `${dc.dc_number} · ${dc.vendor_name}` : ''}
      onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitLabel="Approve" busy={busy} kind="success" />}>
      <ErrorBanner message={error} />
      {req && req.required ? (
        <ErrorBanner kind="warning" message={`E-way bill number is REQUIRED:\n• ${req.reasons.join('\n• ')}`} />
      ) : (
        <Text style={styles.hint}>E-way bill number is optional here: the value is within the limit and the job work is within our state.</Text>
      )}
      <Field label={`E-way bill number${req && req.required ? ' *' : ' (optional)'}`} value={eway} keyboardType="number-pad"
        maxLength={12} onChangeText={(t) => setEway(t.replace(/\D/g, ''))} placeholder="12 digits" hint="Exactly 12 digits" />
    </ActionModal>
  );
}

export function RejectModal({ visible, dc, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const { busy, error, setError, run } = useSubmit(onDone);
  useEffect(() => { if (visible) { setReason(''); setError(''); } }, [visible]);
  const submit = () => {
    if (!reason.trim()) return setError('A reason is required so Store knows what to correct.');
    return run(async () => (await jobworkDcsAPI.reject(dc.id, { reason: reason.trim() })).data);
  };
  return (
    <ActionModal visible={visible} title="Reject delivery challan" subtitle={dc ? dc.dc_number : ''} onClose={onClose}
      footer={<Footer onClose={onClose} onSubmit={submit} submitLabel="Reject" busy={busy} kind="danger" />}>
      <ErrorBanner message={error} />
      <Field label="Reason *" value={reason} onChangeText={setReason} multiline placeholder="What needs to be corrected?" />
    </ActionModal>
  );
}

export function MoveModal({ visible, dc, vendors, onClose, onDone }) {
  const [toVendor, setToVendor] = useState('');
  const [vendorDcNo, setVendorDcNo] = useState('');
  const [note, setNote] = useState('');
  const { busy, error, setError, run } = useSubmit(onDone);
  useEffect(() => { if (visible) { setToVendor(''); setVendorDcNo(''); setNote(''); setError(''); } }, [visible]);
  const at = dc ? (dc.current_location_vendor_id || dc.vendor_id) : null;

  const submit = () => {
    if (!toVendor) return setError('Choose the vendor the material is being forwarded to.');
    return run(async () => (await jobworkDcsAPI.move(dc.id, {
      to_vendor_id: Number(toVendor), vendor_dc_no: vendorDcNo.trim() || undefined, note: note.trim() || undefined,
    })).data);
  };
  return (
    <ActionModal visible={visible} title="Move to another vendor"
      subtitle={dc ? `${dc.dc_number} is now at ${dc.current_location_name || dc.vendor_name}` : ''} onClose={onClose}
      footer={<Footer onClose={onClose} onSubmit={submit} submitLabel="Record move" busy={busy} />}>
      <ErrorBanner message={error} />
      <VendorPicker vendors={vendors} value={toVendor} onChange={setToVendor} label="Forwarded to *" exclude={at ? [at] : []} />
      <Field label="Vendor's DC number (optional)" value={vendorDcNo} onChangeText={setVendorDcNo} />
      <Field label="Note (optional)" value={note} onChangeText={setNote} multiline />
    </ActionModal>
  );
}

export function ChargeFields({ rates, ratesError, state, set }) {
  return (
    <View>
      <Field label="Job charge (₹, before GST)" value={state.jobCharge} keyboardType="decimal-pad"
        onChangeText={(t) => set({ jobCharge: cleanDecimal(t, 2) })} placeholder="0.00"
        hint="GST is charged on this amount only, never on the component value." />
      <Field label="SAC code" value={state.sac} onChangeText={(t) => set({ sac: t })} />
      <GstRatePicker rates={rates} value={state.gstRateId} onChange={(v) => set({ gstRateId: v })}
        label={`GST rate${Number(state.jobCharge) > 0 ? ' *' : ''}`} error={ratesError} />
    </View>
  );
}

export const blankInvoice = () => ({ vendorDcNo: '', vendorDcDate: today(), invoiceNo: '', invoiceDate: today(), jobCharge: '', sac: '', gstRateId: '' });

export function invoicePayload(s) {
  return {
    vendor_dc_no: s.vendorDcNo.trim() || undefined,
    vendor_dc_date: s.vendorDcDate.trim() || undefined,
    invoice_no: s.invoiceNo.trim() || undefined,
    invoice_date: s.invoiceDate.trim() || undefined,
    job_charge: s.jobCharge || undefined,
    sac_code: s.sac.trim() || undefined,
    gst_rate_id: s.gstRateId ? Number(s.gstRateId) : undefined,
  };
}

export function validateInvoice(s, needInvoiceNo) {
  for (const [value, label] of [[s.vendorDcDate, "Vendor DC date"], [s.invoiceDate, 'Invoice date']]) {
    if (value.trim() && !isDate(value.trim())) return `${label} must be written as YYYY-MM-DD.`;
  }
  const charge = Number(s.jobCharge || 0);
  if ((needInvoiceNo || charge > 0) && !s.invoiceNo.trim()) return 'Invoice number is required.';
  if (charge > 0 && !s.gstRateId) return 'Choose a GST rate for the job charge.';
  return '';
}

export function InvoiceModal({ visible, dc, vendors, onClose, onDone }) {
  const { rates, error: ratesError } = useGstRates();
  const [vendorId, setVendorId] = useState('');
  const [inv, setInv] = useState(blankInvoice);
  const { busy, error, setError, run } = useSubmit(onDone);
  const set = (patch) => setInv((s) => ({ ...s, ...patch }));
  useEffect(() => { if (visible) { setVendorId(''); setInv(blankInvoice()); setError(''); } }, [visible]);
  if (!dc) return null;

  // Vendors the material has been with: the original vendor and every move destination.
  const pathIds = new Set([dc.vendor_id]);
  (dc.movements || []).forEach((m) => { pathIds.add(m.from_vendor_id); pathIds.add(m.to_vendor_id); });
  const pathVendors = vendors.filter((v) => pathIds.has(v.id));

  const submit = () => {
    if (!vendorId) return setError('Choose which vendor issued this invoice.');
    const bad = validateInvoice(inv, true);
    if (bad) return setError(bad);
    return run(async () => (await jobworkDcsAPI.addVendorInvoice(dc.id, { vendor_id: Number(vendorId), ...invoicePayload(inv) })).data);
  };

  return (
    <ActionModal visible={visible} title="Record vendor invoice"
      subtitle={`${dc.dc_number} · for a vendor's process, no goods coming back`} onClose={onClose}
      sticky={<TaxPreview vendorId={vendorId ? Number(vendorId) : null} jobCharge={inv.jobCharge} gstRateId={inv.gstRateId} />}
      footer={<Footer onClose={onClose} onSubmit={submit} submitLabel="Save invoice" busy={busy} />}>
      <ErrorBanner message={error} />
      <VendorPicker vendors={pathVendors} value={vendorId} onChange={setVendorId} label="Invoice from *" />
      <Field label="Invoice number *" value={inv.invoiceNo} onChangeText={(t) => set({ invoiceNo: t })} />
      <DateField label="Invoice date" value={inv.invoiceDate} onChange={(v) => set({ invoiceDate: v })} optional />
      <Field label="Vendor DC number" value={inv.vendorDcNo} onChangeText={(t) => set({ vendorDcNo: t })} />
      <DateField label="Vendor DC date" value={inv.vendorDcDate} onChange={(v) => set({ vendorDcDate: v })} optional />
      <ChargeFields rates={rates} ratesError={ratesError} state={inv} set={set} />
    </ActionModal>
  );
}

// Ask the accountant for a stock item. The server attaches the context (project, customer PO,
// item description, process, weights, requester); we only say which item / DC / project it is for.
// context: { jobWorkItemId, dcId, projectId, process, itemDescription }
export function RequestStockItemModal({ visible, initialName, initialHsn, initialUnit, context = {}, onClose, onDone }) {
  const [name, setName] = useState('');
  const [hsn, setHsn] = useState('');
  const [unit, setUnit] = useState('');
  const [drawingNo, setDrawingNo] = useState('');
  const [note, setNote] = useState('');
  const { busy, error, setError, run } = useSubmit(onDone);
  useEffect(() => {
    if (visible) {
      setName(initialName || ''); setHsn(initialHsn || ''); setUnit(initialUnit || ''); setDrawingNo(''); setNote(''); setError('');
    }
  }, [visible]);
  const submit = () => {
    if (!name.trim()) return setError('Item name is required.');
    return run(async () => (await jobworkDcsAPI.createStockItemRequest({
      name: name.trim(), hsn: hsn.trim() || undefined, unit: unit.trim() || undefined, note: note.trim() || undefined,
      drawing_no: drawingNo.trim() || undefined,
      job_work_item_id: context.jobWorkItemId || undefined, dc_id: context.dcId || undefined,
      project_id: context.projectId || undefined, process: context.process || undefined,
      item_description: context.itemDescription || undefined,
    })).data.request);
  };
  return (
    <ActionModal visible={visible} title="Request stock item"
      subtitle="The accountant gets the project, PO and item details with your request." onClose={onClose}
      footer={<Footer onClose={onClose} onSubmit={submit} submitLabel="Send request" busy={busy} />}>
      <ErrorBanner message={error} />
      <Field label="Item name *" value={name} onChangeText={setName} hint="Use the name as it should appear in Tally." />
      <Field label="HSN" value={hsn} onChangeText={setHsn} />
      <Field label="Unit" value={unit} onChangeText={setUnit} placeholder="pcs, kg, ..." />
      <Field label="Drawing no. (if any)" value={drawingNo} onChangeText={setDrawingNo} />
      <Field label="Note" value={note} onChangeText={setNote} multiline />
    </ActionModal>
  );
}
