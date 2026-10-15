import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ejwAPI, jobworkDcsAPI } from '../config/api';
import { apiErrorMessage, appendFile, fmtDate, money, notify, today } from '../utils/jobwork';
import { mailAcknowledgment, pickFile, q3, shareAcknowledgment, takePhoto } from '../utils/ejw';
import { ActionModal, Button, Card, COLORS, ErrorBanner, Field, ScreenHeader, styles } from '../components/jobwork/common';
import DateField from '../components/jobwork/DateField';
import ItemsEditor, { blankItem, itemsPayload } from '../components/ejw/ItemsEditor';
import { KV, Loading, Pill, roleOf, useScreenLoad } from '../components/ejw/parts';
import Footer from '../components/Footer';

// One inward: items with their progress, the trucks (receipts), documents; Store can add a receipt, attach the
// customer's DC (S2) and share the acknowledgment message.
export default function EjwInwardDetailScreen({ route, navigation }) {
  const { user, inwardId, openReceipt } = route.params;
  const isStore = roleOf(user) === 'store_incharge';
  const [inward, setInward] = useState(null);
  const [stockItems, setStockItems] = useState([]);
  const [modal, setModal] = useState(openReceipt ? 'receipt' : null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const [rcpt, setRcpt] = useState({ received_date: today(), vehicle_no: '', eway_bill_no: '', notes: '' });
  const [rcptItems, setRcptItems] = useState([blankItem()]);
  const [dc, setDc] = useState({ no: '', date: '' });

  const { loading, error, reload, setError } = useScreenLoad(async () => {
    const r = await ejwAPI.getInward(inwardId);
    setInward(r.data.inward);
  });

  useEffect(() => {
    if (!isStore) return;
    jobworkDcsAPI.getStockItems().then((r) => setStockItems(r.data.stock_items || [])).catch(() => {});
  }, [isStore]);

  const close = () => { setModal(null); setFormError(''); };
  const run = async (fn, done) => {
    setFormError('');
    setBusy(true);
    try { const r = await fn(); close(); await reload(); if (done) done(r); } catch (e) { setFormError(apiErrorMessage(e)); } finally { setBusy(false); }
  };

  const saveReceipt = () => run(() => ejwAPI.addReceipt(inwardId, { ...rcpt, items: itemsPayload(rcptItems) }), () => {
    setRcpt({ received_date: today(), vehicle_no: '', eway_bill_no: '', notes: '' });
    setRcptItems([blankItem()]);
  });
  const attachDc = () => run(() => ejwAPI.attachCustomerDc(inwardId, { customer_dc_no: dc.no, customer_dc_date: dc.date }), (r) => {
    const w = (r.data.warnings || []).map((x) => x.message);
    notify('Customer DC attached', w.length ? w.join('\n') : 'Dispatch is no longer blocked by this DC.');
  });

  const addPhoto = async (fromCamera) => {
    try {
      const f = fromCamera ? await takePhoto() : await pickFile(['image/*', 'application/pdf']);
      if (!f) return;
      const fd = new FormData();
      fd.append('kind', fromCamera || f.type.startsWith('image') ? 'photo' : 'customer_dc');
      await appendFile(fd, 'file', f);
      await ejwAPI.uploadInwardDocument(inwardId, fd);
      await reload();
    } catch (e) { setError(apiErrorMessage(e, 'Could not upload the file.')); }
  };

  const acknowledge = async (how) => {
    try {
      const r = await ejwAPI.getAcknowledgment(inwardId);
      if (how === 'mail') await mailAcknowledgment(r.data.acknowledgment); else await shareAcknowledgment(r.data.acknowledgment);
    } catch (e) { notify('Acknowledgment', apiErrorMessage(e, e.message)); }
  };

  if (loading || !inward) return <View style={styles.container}><ScreenHeader title="Inward" onBack={() => navigation.goBack()} /><ErrorBanner message={error} />{loading ? <Loading /> : null}</View>;
  const closed = inward.status === 'closed';

  return (
    <View style={styles.container}>
      <ScreenHeader title={inward.inward_no} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <ErrorBanner message={error} />
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '700', fontSize: 16 }}>{inward.customer_name}</Text>
            <Pill text={closed ? 'Closed' : 'Open'} meta={{ color: closed ? COLORS.success : COLORS.primary }} />
          </View>
          <KV label="Customer DC" value={inward.customer_dc_no ? `${inward.customer_dc_no}${inward.customer_dc_date ? ` (${fmtDate(inward.customer_dc_date)})` : ''}` : 'Not attached yet'} bold />
          {inward.third_party ? (
            <>
              <KV label="Sent by" value={inward.supplier_name} />
              <KV label="Supplier DC" value={`${inward.supplier_dc_no || '-'}${inward.supplier_dc_date ? ` (${fmtDate(inward.supplier_dc_date)})` : ''}`} />
            </>
          ) : null}
          <KV label="Declared value" value={money(inward.total_value)} />
          {inward.notes ? <KV label="Notes" value={inward.notes} /> : null}
        </Card>

        {inward.customer_dc_pending ? (
          <View style={{ borderWidth: 1, borderColor: COLORS.warn, backgroundColor: '#FFF6E5', borderRadius: 8, padding: 10, marginVertical: 6 }}>
            <Text style={{ color: COLORS.warn, fontWeight: '700' }}>Customer DC still to come</Text>
            <Text style={{ color: COLORS.warn, fontSize: 13, marginTop: 2 }}>Dispatch of this material is blocked until the customer's own delivery challan is attached.</Text>
            {isStore ? <Button title="Attach customer DC" style={{ marginTop: 8 }} onPress={() => setModal('dc')} /> : null}
          </View>
        ) : null}

        {inward.third_party ? (
          <Card>
            <Text style={styles.label}>Acknowledgment to the customer</Text>
            <Text style={styles.hint}>Tell {inward.customer_name} the material arrived and ask for their PO and DC.</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Button style={{ flex: 1 }} title="Share / copy" kind="ghost" onPress={() => acknowledge('share')} />
              <Button style={{ flex: 1 }} title="Email" kind="ghost" onPress={() => acknowledge('mail')} />
            </View>
          </Card>
        ) : null}

        <Text style={styles.sectionTitle}>Items</Text>
        {inward.items.map((it) => (
          <Card key={it.id}>
            <Text style={{ fontWeight: '700' }}>{it.description}</Text>
            <Text style={styles.hint}>HSN {it.hsn || '-'} {'·'} Truck {it.receipt_no} {'·'} {it.wo_no ? `On ${it.wo_no}` : 'Not on a work order yet'}</Text>
            {it.stock_item_pending ? (
              <TouchableOpacity disabled={!it.stock_request_id || isStore} onPress={() => navigation.navigate('StockItemRequestDetail', { user, requestId: it.stock_request_id })}>
                <Text style={{ color: COLORS.warn, fontWeight: '600', marginTop: 3 }}>
                  Waiting for Accounts to create the stock item{it.stock_request_status ? ` (${it.stock_request_status})` : ''}
                  {!isStore && it.stock_request_id ? '  › open' : ''}
                </Text>
              </TouchableOpacity>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
              {[['Received', it.qty], ['Issued', it.issued_qty], ['Ready', it.ready_qty], ['Returned', it.returned_qty], ['Written off', it.short_closed_qty]].map(([l, v]) => (
                <View key={l} style={{ width: '20%', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700' }}>{q3(v)}</Text>
                  <Text style={{ fontSize: 10, color: COLORS.muted }}>{l}</Text>
                </View>
              ))}
            </View>
            {it.unit_value !== undefined ? <Text style={[styles.hint, { marginTop: 4 }]}>{q3(it.qty)} {it.unit} @ {money(it.unit_value)} = {money(it.total_value)}</Text> : <Text style={styles.hint}>Unit: {it.unit}</Text>}
          </Card>
        ))}

        <Text style={styles.sectionTitle}>Trucks received</Text>
        {inward.receipts.map((r) => (
          <Card key={r.id}>
            <Text style={{ fontWeight: '600' }}>Truck {r.receipt_no} {'·'} {fmtDate(r.received_date)}</Text>
            <Text style={styles.hint}>Vehicle {r.vehicle_no || '-'} {'·'} E-way {r.eway_bill_no || '-'}</Text>
          </Card>
        ))}
        {isStore && !closed ? <Button title="+ Add receipt (another truck of this DC)" kind="ghost" onPress={() => setModal('receipt')} /> : null}

        <Text style={styles.sectionTitle}>Documents and photos</Text>
        <Card>
          {inward.documents.length === 0 ? <Text style={styles.hint}>None yet.</Text> : inward.documents.map((d) => <Text key={d.id} style={{ fontSize: 13, paddingVertical: 2 }}>{d.kind}: {d.file_name}</Text>)}
          {isStore ? (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <Button style={{ flex: 1 }} title="Take photo" kind="ghost" onPress={() => addPhoto(true)} />
              <Button style={{ flex: 1 }} title="Choose file" kind="ghost" onPress={() => addPhoto(false)} />
            </View>
          ) : null}
        </Card>
      </ScrollView>

      <ActionModal visible={modal === 'receipt'} title="Add receipt" subtitle="Another truck of the same customer DC" onClose={close}
        footer={<><Button title="Cancel" kind="ghost" onPress={close} disabled={busy} /><Button title="Save receipt" onPress={saveReceipt} loading={busy} /></>}>
        <ErrorBanner message={formError} />
        <DateField label="Received on *" value={rcpt.received_date} onChange={(v) => setRcpt({ ...rcpt, received_date: v })} />
        <Field label="Vehicle no." value={rcpt.vehicle_no} autoCapitalize="characters" onChangeText={(t) => setRcpt({ ...rcpt, vehicle_no: t.toUpperCase() })} />
        <Field label="E-way bill no." value={rcpt.eway_bill_no} keyboardType="numeric" maxLength={12} onChangeText={(t) => setRcpt({ ...rcpt, eway_bill_no: t.replace(/\D/g, '') })} />
        <ItemsEditor items={rcptItems} setItems={setRcptItems} stockItems={stockItems} />
      </ActionModal>

      <ActionModal visible={modal === 'dc'} title="Attach customer DC" subtitle={`For ${inward.inward_no}`} onClose={close}
        footer={<><Button title="Cancel" kind="ghost" onPress={close} disabled={busy} /><Button title="Attach" onPress={attachDc} loading={busy} /></>}>
        <ErrorBanner message={formError} />
        <Field label="Customer DC no. *" value={dc.no} onChangeText={(t) => setDc({ ...dc, no: t })} />
        <DateField label="Customer DC date *" value={dc.date} onChange={(v) => setDc({ ...dc, date: v })} />
      </ActionModal>
      <Footer />
    </View>
  );
}
