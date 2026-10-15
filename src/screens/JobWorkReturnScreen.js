import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { jobworkDcsAPI } from '../config/api';
import { apiErrorMessage, cleanDecimal, notify, qty } from '../utils/jobwork';
import { Button, Card, COLORS, ErrorBanner, Field, ScreenHeader, StatusBadge, styles } from '../components/jobwork/common';
import { ChargeFields, blankInvoice, invoicePayload, validateInvoice } from '../components/jobwork/Modals';
import { useGstRates } from '../components/jobwork/Pickers';
import TaxPreview from '../components/jobwork/TaxPreview';
import DateField from '../components/jobwork/DateField';
import Footer from '../components/Footer';

// Store records material coming back on a delivery challan. The return is always from the vendor the
// material is with now, so there is nothing to pick: quantity per item, the vendor's documents, the
// job charge and GST rate. The server does the tax maths, checks the quantities and sets the DC to
// partially returned or closed.
export default function JobWorkReturnScreen({ route, navigation }) {
  const { user, dcId } = route.params;
  const { rates, error: ratesError } = useGstRates();
  const [dc, setDc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qtys, setQtys] = useState({});
  const [inv, setInv] = useState(blankInvoice());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (patch) => setInv((s) => ({ ...s, ...patch }));

  useEffect(() => {
    jobworkDcsAPI.get(dcId)
      .then((r) => setDc(r.data.dc))
      .catch((e) => setError(apiErrorMessage(e, 'Could not load this delivery challan.')))
      .finally(() => setLoading(false));
  }, [dcId]);

  if (loading || !dc) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Record return" onBack={() => navigation.goBack()} />
        {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color={COLORS.primary} /> : <View style={styles.content}><ErrorBanner message={error} /></View>}
      </View>
    );
  }

  const vendorId = dc.current_location_vendor_id || dc.vendor_id;
  const vendorName = dc.current_location_name || dc.vendor_name;
  const open = ['dispatched', 'partially_returned'].includes(dc.status);
  const items = dc.items.filter((i) => Number(i.quantity) > Number(i.returned_quantity));

  const save = async () => {
    const lines = items
      .filter((i) => qtys[i.id] && Number(qtys[i.id]) > 0)
      .map((i) => ({ dc_item_id: i.id, quantity_received: qtys[i.id] }));
    if (lines.length === 0) return setError('Enter the quantity received for at least one item.');
    const over = items.find((i) => qtys[i.id] && Number(qtys[i.id]) > Number(i.quantity) - Number(i.returned_quantity));
    if (over) return setError(`"${over.description}": only ${qty(Number(over.quantity) - Number(over.returned_quantity))} is still pending.`);
    const bad = validateInvoice(inv, false);
    if (bad) return setError(bad);

    setError('');
    setSaving(true);
    try {
      const res = await jobworkDcsAPI.addReturn(dc.id, { vendor_id: vendorId, items: lines, ...invoicePayload(inv) });
      notify('Return recorded', res.data.dc.status === 'closed'
        ? 'Everything is back, so the delivery challan is now closed.'
        : 'The delivery challan is partially returned.');
      navigation.goBack();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not record the return.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Record return" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 20 }]} keyboardShouldPersistTaps="handled">
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>{dc.dc_number}</Text>
            <StatusBadge status={dc.status} />
          </View>
          <Text style={{ marginTop: 4 }}>Coming back from <Text style={{ fontWeight: '700' }}>{vendorName}</Text></Text>
        </Card>

        {!open ? <ErrorBanner message={`Returns can only be recorded on a dispatched or partially returned challan (this one is ${dc.status}).`} /> : null}

        <Text style={styles.sectionTitle}>Quantity received</Text>
        {items.map((i) => {
          const pending = Number(i.quantity) - Number(i.returned_quantity);
          return (
            <Card key={i.id}>
              <Text style={{ fontWeight: '700', fontSize: 15 }}>{i.description}</Text>
              <Text style={styles.hint}>{i.project_name || '-'} · sent {qty(i.quantity)} {i.unit} · returned {qty(i.returned_quantity)} · pending {qty(pending)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <Field style={{ flex: 1, marginBottom: 0 }} value={qtys[i.id] || ''} keyboardType="decimal-pad" placeholder="0"
                  onChangeText={(t) => setQtys((q) => ({ ...q, [i.id]: cleanDecimal(t, 3) }))} />
                <Button title="All" kind="ghost" onPress={() => setQtys((q) => ({ ...q, [i.id]: String(pending) }))} />
              </View>
            </Card>
          );
        })}

        <Text style={styles.sectionTitle}>Vendor documents</Text>
        <Card>
          <Field label="Vendor DC number" value={inv.vendorDcNo} onChangeText={(t) => set({ vendorDcNo: t })} />
          <DateField label="Vendor DC date" value={inv.vendorDcDate} onChange={(v) => set({ vendorDcDate: v })} optional />
          <Field label="Invoice number" value={inv.invoiceNo} onChangeText={(t) => set({ invoiceNo: t })} hint="Required when there is a job charge." />
          <DateField label="Invoice date" value={inv.invoiceDate} onChange={(v) => set({ invoiceDate: v })} optional />
        </Card>

        <Text style={styles.sectionTitle}>Job charge</Text>
        <Card>
          <ChargeFields rates={rates} ratesError={ratesError} state={inv} set={set} />
        </Card>
      </ScrollView>

      {/* pinned: the tax split, any error, and the save button stay in view */}
      <View style={{ padding: 12, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: COLORS.border }}>
        <ErrorBanner message={error} />
        <TaxPreview vendorId={vendorId} jobCharge={inv.jobCharge} gstRateId={inv.gstRateId} />
        <Button title="Save return" kind="success" onPress={save} loading={saving} disabled={!open} style={{ marginTop: 8 }} />
      </View>
      <Footer />
    </View>
  );
}
