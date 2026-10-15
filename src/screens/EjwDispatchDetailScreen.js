import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ejwAPI } from '../config/api';
import { apiErrorMessage, fmtDate, money, notify } from '../utils/jobwork';
import { DISPATCH_STATUS, downloadAndSharePdf, q3 } from '../utils/ejw';
import { ActionModal, Button, Card, ErrorBanner, Field, ScreenHeader, styles } from '../components/jobwork/common';
import IssueModal from '../components/ejw/IssueModal';
import { KV, Loading, Pill, roleOf, useScreenLoad } from '../components/ejw/parts';
import Footer from '../components/Footer';

// One dispatch: the delivery challan and the tax invoice it made. Draft: edit / issue / delete. Issued: print, share, cancel.
export default function EjwDispatchDetailScreen({ route, navigation }) {
  const { user, dispatchId } = route.params;
  const role = roleOf(user);
  const isAccounts = role === 'accountant';
  const canSeeInvoice = role === 'accountant' || role === 'management';
  const [d, setD] = useState(null);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [sharing, setSharing] = useState('');

  const { loading, error, reload, setError } = useScreenLoad(async () => {
    const r = await ejwAPI.getDispatch(dispatchId);
    setD(r.data.dispatch);
  });

  const close = () => { setModal(null); setFormError(''); };
  const cancel = async () => {
    setFormError(''); setBusy(true);
    try { await ejwAPI.cancelDispatch(dispatchId, reason); setReason(''); close(); await reload(); notify('Cancelled', 'The material is back on the work order. The numbers stay used.'); } catch (e) { setFormError(apiErrorMessage(e)); } finally { setBusy(false); }
  };
  const remove = async () => {
    setError('');
    try { await ejwAPI.deleteDispatch(dispatchId); navigation.goBack(); } catch (e) { setError(apiErrorMessage(e)); }
  };
  const share = async (kind) => {
    setError(''); setSharing(kind);
    try { await downloadAndSharePdf(ejwAPI.pdfPath(kind, dispatchId), kind === 'tax-invoice' ? `Invoice_${d.invoice_no}` : `DC_${d.dc_no}`); } catch (e) { setError(e.message || 'Could not create the PDF.'); } finally { setSharing(''); }
  };

  if (loading || !d) return <View style={styles.container}><ScreenHeader title="Dispatch" onBack={() => navigation.goBack()} /><ErrorBanner message={error} />{loading ? <Loading /> : null}</View>;
  const interstate = Number(d.igst_amount) > 0;

  return (
    <View style={styles.container}>
      <ScreenHeader title={d.dc_no || `Draft for ${d.wo_no}`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <ErrorBanner message={error} />
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', fontSize: 16 }}>{d.customer_name}</Text>
            <Pill meta={DISPATCH_STATUS[d.status]} />
          </View>
          <KV label="Work order" value={d.wo_no} />
          <KV label="Customer PO no." value={d.customer_po_no} />
          <KV label="Delivery challan" value={d.dc_no ? `${d.dc_no} (${fmtDate(d.dc_date)})` : 'not issued'} bold />
          {canSeeInvoice ? <KV label="Tax invoice" value={d.invoice_no ? `${d.invoice_no} (${fmtDate(d.invoice_date)})` : 'not issued'} bold /> : null}
          <KV label="Vehicle" value={d.vehicle_no} />
          <KV label="E-way bill" value={d.eway_bill_no} />
          {d.status === 'cancelled' ? <KV label="Cancelled" value={`${d.cancel_reason} (${fmtDate(d.cancelled_at)})`} /> : null}
        </Card>

        <Text style={styles.sectionTitle}>Delivery challan lines</Text>
        {d.items.map((i) => (
          <Card key={i.id}>
            <Text style={{ fontWeight: '700' }}>{i.description}</Text>
            <Text style={styles.hint}>HSN {i.hsn || '-'} {'·'} {q3(i.qty)} {i.unit} {'·'} customer DC {i.customer_dc_no || '-'}</Text>
            {i.value !== undefined ? <Text style={styles.hint}>Value {money(i.value)}</Text> : null}
          </Card>
        ))}
        {d.component_value !== undefined ? <KV label="Value of goods (no GST)" value={money(d.component_value)} bold /> : null}

        {canSeeInvoice ? (
          <>
            <Text style={styles.sectionTitle}>Tax invoice (job charge)</Text>
            <Card>
              <KV label="Place of supply" value={d.place_of_supply_state ? `${d.place_of_supply_state} (${d.place_of_supply_code})` : '-'} />
              <KV label="SAC" value={d.sac_code} />
              <KV label="Taxable value" value={money(d.taxable_value)} />
              {interstate ? <KV label="IGST" value={money(d.igst_amount)} /> : <><KV label="CGST" value={money(d.cgst_amount)} /><KV label="SGST" value={money(d.sgst_amount)} /></>}
              <KV label="Invoice total" value={money(d.invoice_total)} bold />
              <KV label="Dispatch total" value={money(d.dispatch_total)} />
            </Card>
          </>
        ) : null}

        {d.status !== 'draft' ? (
          <View style={{ gap: 10, marginTop: 8 }}>
            <Button title="Delivery challan PDF (share / print)" kind="ghost" loading={sharing === 'delivery-challan'} onPress={() => share('delivery-challan')} />
            {canSeeInvoice ? <Button title="Tax invoice PDF (share / print)" kind="ghost" loading={sharing === 'tax-invoice'} onPress={() => share('tax-invoice')} /> : null}
          </View>
        ) : null}

        {isAccounts && d.status === 'draft' ? (
          <View style={{ gap: 10, marginTop: 8 }}>
            <Button title="Issue..." kind="success" onPress={() => setModal('issue')} />
            <Button title="Edit draft" kind="ghost" onPress={() => navigation.navigate('EjwDispatchForm', { user, woId: d.wo_id, dispatchId: d.id })} />
            <Button title="Delete draft" kind="danger" onPress={remove} />
          </View>
        ) : null}
        {isAccounts && d.status === 'issued' ? <Button style={{ marginTop: 10 }} title="Cancel this dispatch..." kind="danger" onPress={() => setModal('cancel')} /> : null}
      </ScrollView>

      <IssueModal visible={modal === 'issue'} dispatch={d} onClose={close}
        onIssued={async () => { close(); await reload(); notify('Issued', 'Challan and invoice created. Share them from this page.'); }} />
      <ActionModal visible={modal === 'cancel'} title="Cancel dispatch" subtitle={`${d.dc_no} / ${d.invoice_no}`} onClose={close}
        footer={<><Button title="Keep it" kind="ghost" onPress={close} disabled={busy} /><Button title="Cancel dispatch" kind="danger" onPress={cancel} loading={busy} /></>}>
        <ErrorBanner message={formError} />
        <ErrorBanner kind="warning" message="The material goes back onto the work order as not dispatched. Both numbers stay used and are never reissued. Issue a corrected dispatch afterwards." />
        <Field label="Reason *" value={reason} onChangeText={setReason} multiline />
      </ActionModal>
      <Footer />
    </View>
  );
}
