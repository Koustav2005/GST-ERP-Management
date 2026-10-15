import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { ejwAPI } from '../config/api';
import { apiErrorMessage, cleanDecimal, money, notify } from '../utils/jobwork';
import { q3 } from '../utils/ejw';
import { Button, Card, COLORS, ErrorBanner, Field, ScreenHeader, styles } from '../components/jobwork/common';
import { GstRatePicker, useGstRates } from '../components/jobwork/Pickers';
import IssueModal from '../components/ejw/IssueModal';
import { Blockers, KV, Loading } from '../components/ejw/parts';
import Footer from '../components/Footer';

// Accounts: dispatch material back to the customer. One dispatch = delivery challan (component lines, no GST)
// + tax invoice (job charge only). The preview comes from the server, the same code that saves and issues.
export default function EjwDispatchFormScreen({ route, navigation }) {
  const { user, woId, dispatchId } = route.params;
  const { rates, error: ratesError } = useGstRates();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [wo, setWo] = useState(null);
  const [qtys, setQtys] = useState({}); // inward item id -> qty text ('' = not in this dispatch)
  const [jobCharge, setJobCharge] = useState('');
  const [sac, setSac] = useState('998875');
  const [gstRateId, setGstRateId] = useState('');
  const [invDesc, setInvDesc] = useState('');
  const [processText, setProcessText] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [eway, setEway] = useState('');
  const [preview, setPreview] = useState({ loading: false, data: null, error: '' });
  const [issueFor, setIssueFor] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await ejwAPI.getWorkOrder(woId);
        const w = r.data.work_order;
        setWo(w);
        setProcessText(w.description || '');
        const dispatchable = Object.fromEntries(w.items.filter((i) => Number(i.ready_qty) - Number(i.returned_qty) > 0).map((i) => [i.id, String(Number(i.ready_qty) - Number(i.returned_qty))]));
        if (dispatchId) {
          const d = (await ejwAPI.getDispatch(dispatchId)).data.dispatch;
          if (d.status !== 'draft') throw new Error('Only a draft can be edited.');
          setQtys(Object.fromEntries(d.items.map((i) => [i.inward_item_id, String(Number(i.qty))])));
          setJobCharge(String(Number(d.taxable_value)));
          setSac(d.sac_code || '998875');
          setGstRateId(d.gst_rate_id ? String(d.gst_rate_id) : '');
          setInvDesc(d.job_description || '');
          setProcessText(d.process_text || w.description || '');
          setVehicle(d.vehicle_no || '');
          setEway(d.eway_bill_no || '');
        } else {
          setQtys(dispatchable);
        }
      } catch (e) { setError(apiErrorMessage(e, e.message)); } finally { setLoading(false); }
    })();
  }, []);

  const body = () => ({
    wo_id: woId,
    items: Object.entries(qtys).filter(([, q]) => Number(q) > 0).map(([id, q]) => ({ inward_item_id: Number(id), qty: q })),
    job_charge: jobCharge, sac_code: sac, gst_rate_id: gstRateId ? Number(gstRateId) : undefined, job_description: invDesc,
    process_text: processText, vehicle_no: vehicle, eway_bill_no: eway,
  });

  // live preview: wait until there is something to calculate
  const seq = useRef(0);
  useEffect(() => {
    const b = body();
    if (!b.items.length || !(Number(jobCharge) > 0) || !gstRateId) { setPreview({ loading: false, data: null, error: '' }); return undefined; }
    const mine = ++seq.current;
    setPreview((p) => ({ ...p, loading: true, error: '' }));
    const t = setTimeout(async () => {
      try {
        const r = await ejwAPI.previewDispatch(b);
        if (mine === seq.current) setPreview({ loading: false, data: r.data, error: '' });
      } catch (e) { if (mine === seq.current) setPreview({ loading: false, data: null, error: apiErrorMessage(e, 'Could not calculate.') }); }
    }, 400);
    return () => clearTimeout(t);
  }, [qtys, jobCharge, gstRateId, sac]);

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      const r = dispatchId ? await ejwAPI.updateDispatch(dispatchId, body()) : await ejwAPI.createDispatch(body());
      return r.data.dispatch;
    } catch (e) { setError(apiErrorMessage(e, 'Could not save the dispatch.')); return null; } finally { setSaving(false); }
  };
  const saveDraft = async () => {
    const d = await save();
    if (d) { notify('Draft saved', 'Nothing is knocked off until you issue it.'); navigation.replace('EjwDispatchDetail', { user, dispatchId: d.id }); }
  };
  const saveAndIssue = async () => { const d = await save(); if (d) setIssueFor(d); };

  if (loading || !wo) return <View style={styles.container}><ScreenHeader title="Dispatch" onBack={() => navigation.goBack()} /><ErrorBanner message={error} />{loading ? <Loading /> : null}</View>;

  const p = preview.data;
  const dispatchable = wo.items.filter((i) => Number(i.ready_qty) - Number(i.returned_qty) > 0);

  return (
    <View style={styles.container}>
      <ScreenHeader title={`Dispatch ${wo.wo_no}`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={error} />
        <Card>
          <Text style={{ fontWeight: '700', fontSize: 16 }}>{wo.customer_name}</Text>
          <KV label="Customer GSTIN" value={wo.customer_gstin || 'not set: set it in Customer Master'} />
          <KV label="Customer PO no." value={wo.customer_po_no || 'MISSING'} bold />
        </Card>
        {p ? <Blockers items={p.blockers} /> : !wo.customer_po_no ? <Blockers items={['Customer PO number is missing. The project manager must record it on the work order.']} /> : null}

        <Text style={styles.sectionTitle}>Material going back (confirmed ready by Store)</Text>
        {dispatchable.length === 0 ? <Card><Text style={styles.hint}>Nothing is confirmed ready and undispatched.</Text></Card> : dispatchable.map((i) => {
          const max = Number(i.ready_qty) - Number(i.returned_qty);
          return (
            <Card key={i.id}>
              <Text style={{ fontWeight: '700' }}>{i.description}</Text>
              <Text style={styles.hint}>HSN {i.hsn || '-'} {'·'} {i.customer_dc_pending ? 'CUSTOMER DC NOT ATTACHED' : `Customer DC ${i.customer_dc_no}`} {'·'} {money(i.unit_value)} per {i.unit}</Text>
              <Field label={`Quantity to dispatch (${i.unit}); up to ${q3(max)}`} value={qtys[i.id] === undefined ? '' : qtys[i.id]} keyboardType="decimal-pad"
                onChangeText={(t) => setQtys({ ...qtys, [i.id]: cleanDecimal(t, 3) })} hint="Leave empty to keep it out of this dispatch (partial dispatch)." />
            </Card>
          );
        })}

        <Text style={styles.sectionTitle}>Invoice (job charge only)</Text>
        <Card>
          <Field label="Job charge (Rs.) *" value={jobCharge} keyboardType="decimal-pad" onChangeText={(t) => setJobCharge(cleanDecimal(t, 2))} hint="GST is charged on this amount only, never on the material value." />
          <GstRatePicker rates={rates} value={gstRateId} onChange={setGstRateId} error={ratesError} />
          <Field label="SAC code" value={sac} keyboardType="numeric" maxLength={8} onChangeText={(t) => setSac(t.replace(/\D/g, ''))} hint="998875 = job work services" />
          <Field label="Invoice description" value={invDesc} onChangeText={setInvDesc} placeholder="Job work charges (...)" />
          <Field label="Process (printed on the challan: 'return after ...')" value={processText} onChangeText={setProcessText} />
        </Card>

        <Text style={styles.sectionTitle}>Transport</Text>
        <Card>
          <Field label="Vehicle no." value={vehicle} autoCapitalize="characters" onChangeText={(t) => setVehicle(t.toUpperCase())} />
          <Field label={`E-way bill no.${p && p.eway.required ? ' *' : ''}`} value={eway} keyboardType="numeric" maxLength={12} onChangeText={(t) => setEway(t.replace(/\D/g, ''))} />
          {p ? (
            p.eway.required
              ? <Text style={{ color: COLORS.warn, fontSize: 13, fontWeight: '600' }}>E-way bill REQUIRED: {p.eway.reasons.join('; ')}</Text>
              : <Text style={styles.hint}>E-way bill not required for this dispatch.</Text>
          ) : <Text style={styles.hint}>Whether an e-way bill is needed is shown once the amounts are filled in.</Text>}
        </Card>

        <Text style={styles.sectionTitle}>Preview</Text>
        <Card>
          {preview.loading ? <ActivityIndicator color={COLORS.primary} /> : null}
          <ErrorBanner message={preview.error} />
          {!p && !preview.loading && !preview.error ? <Text style={styles.hint}>Enter the quantities, the job charge and the GST rate to see the invoice.</Text> : null}
          {p ? (
            <>
              <KV label="Place of supply" value={p.place_of_supply && p.place_of_supply.state ? `${p.place_of_supply.state} (${p.place_of_supply.code})` : '-'} />
              <KV label="Component value (challan)" value={money(p.component_value)} />
              <KV label="Taxable job charge" value={money(p.taxable_value)} />
              {p.gst_split === 'CGST_SGST'
                ? <><KV label={`CGST @ ${Number(p.gst_rate) / 2}%`} value={money(p.cgst_amount)} /><KV label={`SGST @ ${Number(p.gst_rate) / 2}%`} value={money(p.sgst_amount)} /></>
                : <KV label={`IGST @ ${Number(p.gst_rate)}%`} value={money(p.igst_amount)} />}
              <KV label="Invoice total" value={money(p.invoice_total)} bold />
              <KV label="Dispatch total (e-way basis)" value={money(p.dispatch_total)} bold />
              <KV label="Next numbers" value={`${p.next_dc_no}  /  ${p.next_invoice_no}`} />
            </>
          ) : null}
        </Card>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
          <Button style={{ flex: 1 }} title="Save draft" kind="ghost" onPress={saveDraft} loading={saving} />
          <Button style={{ flex: 1 }} title="Save & issue..." kind="success" onPress={saveAndIssue} disabled={saving || !!(p && p.blockers.length)} />
        </View>
      </ScrollView>
      <IssueModal visible={!!issueFor} dispatch={issueFor} ewayRequired={!!(p && p.eway.required)} ewayReasons={p && p.eway.reasons}
        onClose={() => { if (issueFor) navigation.replace('EjwDispatchDetail', { user, dispatchId: issueFor.id }); }}
        onIssued={(d) => { setIssueFor(null); notify('Issued', `Challan ${d.dc_no} and invoice ${d.invoice_no} created.`); navigation.replace('EjwDispatchDetail', { user, dispatchId: d.id }); }} />
      <Footer />
    </View>
  );
}
