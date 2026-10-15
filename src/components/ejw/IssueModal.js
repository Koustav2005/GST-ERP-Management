import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { docSequencesAPI, ejwAPI } from '../../config/api';
import { apiErrorMessage, today } from '../../utils/jobwork';
import { ActionModal, Button, ErrorBanner, Field, styles } from '../jobwork/common';
import DateField from '../jobwork/DateField';

// Issue a draft dispatch: both document numbers (typed from Tally, or generated, per the company's number source),
// dates, and the e-way bill number when it is required. The server re-checks everything.
export default function IssueModal({ visible, dispatch, ewayRequired, ewayReasons, onClose, onIssued }) {
  const [source, setSource] = useState({ DC: 'app', INV: 'app' });
  const [next, setNext] = useState({ DC: '', INV: '' });
  const [f, setF] = useState({ dc_no: '', invoice_no: '', dc_date: today(), invoice_date: today(), eway_bill_no: '', vehicle_no: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setError('');
    setF({ dc_no: '', invoice_no: '', dc_date: today(), invoice_date: today(), eway_bill_no: (dispatch && dispatch.eway_bill_no) || '', vehicle_no: (dispatch && dispatch.vehicle_no) || '' });
    docSequencesAPI.getAll().then((r) => {
      const by = Object.fromEntries((r.data.sequences || []).map((s) => [s.series, s]));
      setSource({ DC: (by.DC && by.DC.number_source) || 'app', INV: (by.INV && by.INV.number_source) || 'app' });
      setNext({ DC: (by.DC && by.DC.next_number) || '', INV: (by.INV && by.INV.next_number) || '' });
    }).catch(() => {});
  }, [visible, dispatch && dispatch.id]);

  const issue = async () => {
    setError('');
    setBusy(true);
    try {
      const r = await ejwAPI.issueDispatch(dispatch.id, {
        dc_no: f.dc_no.trim(), invoice_no: f.invoice_no.trim(), dc_date: f.dc_date, invoice_date: f.invoice_date,
        eway_bill_no: f.eway_bill_no, vehicle_no: f.vehicle_no,
      });
      onIssued(r.data.dispatch);
    } catch (e) { setError(apiErrorMessage(e, 'Could not issue the dispatch.')); } finally { setBusy(false); }
  };

  const hint = (s, n) => (source[s] === 'manual' ? 'Required: this company enters the number from Tally.' : `Leave blank to use ${n || 'the next number'}, or type the Tally number.`);

  return (
    <ActionModal visible={visible} title="Issue dispatch" subtitle="Creates the delivery challan and the tax invoice together. Numbers cannot be reused once issued." onClose={onClose}
      footer={<><Button title="Cancel" kind="ghost" onPress={onClose} disabled={busy} /><Button title="Issue" kind="success" onPress={issue} loading={busy} /></>}>
      <ErrorBanner message={error} />
      <Field label={`Delivery challan no.${source.DC === 'manual' ? ' *' : ''}`} value={f.dc_no} onChangeText={(t) => setF({ ...f, dc_no: t })} maxLength={16} autoCapitalize="characters" hint={hint('DC', next.DC)} />
      <DateField label="Challan date" value={f.dc_date} onChange={(v) => setF({ ...f, dc_date: v })} />
      <Field label={`Invoice no.${source.INV === 'manual' ? ' *' : ''}`} value={f.invoice_no} onChangeText={(t) => setF({ ...f, invoice_no: t })} maxLength={16} autoCapitalize="characters" hint={hint('INV', next.INV)} />
      <DateField label="Invoice date" value={f.invoice_date} onChange={(v) => setF({ ...f, invoice_date: v })} />
      <Field label="Vehicle no." value={f.vehicle_no} autoCapitalize="characters" onChangeText={(t) => setF({ ...f, vehicle_no: t.toUpperCase() })} />
      <Field label={`E-way bill no.${ewayRequired ? ' *' : ''}`} value={f.eway_bill_no} keyboardType="numeric" maxLength={12} onChangeText={(t) => setF({ ...f, eway_bill_no: t.replace(/\D/g, '') })}
        hint={ewayRequired ? 'Required: 12 digits.' : '12 digits, only if you made one.'} />
      {ewayRequired && ewayReasons && ewayReasons.length ? <Text style={[styles.hint, { color: '#FF9500' }]}>{ewayReasons.join('; ')}</Text> : null}
    </ActionModal>
  );
}
