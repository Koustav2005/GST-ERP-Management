import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { getApiUrl, jobworkDcsAPI, masterVendorsAPI } from '../config/api';
import { apiErrorMessage, fmtDate, money, notify, qty } from '../utils/jobwork';
import { ActionModal, Button, Card, COLORS, ErrorBanner, Row, ScreenHeader, StatusBadge, styles } from '../components/jobwork/common';
import { GstSplitLine } from '../components/jobwork/TaxPreview';
import { ApproveModal, InvoiceModal, MoveModal, RejectModal } from '../components/jobwork/Modals';
import Footer from '../components/Footer';
import { downloadAndSharePdf } from '../utils/ejw';
import { ejwAPI } from '../config/api';

// One detail screen for both roles. Store sees dispatch / move / return / invoice actions,
// the accountant sees approve / reject. The backend enforces the same rules either way.
export default function JobWorkDCDetailScreen({ route, navigation }) {
  const { user, dcId } = route.params;
  const isStore = user.role === 'store_incharge';
  const isAccountant = user.role === 'accountant';

  const [dc, setDc] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(false);
  const printDc = async () => {
    setPrinting(true);
    try { await downloadAndSharePdf(ejwAPI.pdfPath('internal-dc', dc.id), `DC_${dc.dc_number}`); } catch (e) { setError(e.message || 'Could not create the PDF.'); } finally { setPrinting(false); }
  };
  const [modal, setModal] = useState(null); // approve | reject | move | return | invoice | dispatch
  const [busy, setBusy] = useState(false);
  const [dispatchError, setDispatchError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await jobworkDcsAPI.get(dcId);
      setDc(res.data.dc);
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load this delivery challan.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dcId]);

  useEffect(() => {
    load();
    if (isStore) masterVendorsAPI.getAll().then((r) => setVendors(r.data || [])).catch(() => {});
    return navigation.addListener('focus', load);
  }, [load, navigation]);

  const afterAction = (message) => (result) => {
    setModal(null);
    if (result && result.dc) setDc(result.dc);
    else load();
    if (message) notify('Done', typeof message === 'function' ? message(result) : message);
    load(); // re-read so the e-way requirement and totals are fresh
  };

  const dispatchDc = async () => {
    setBusy(true);
    setDispatchError('');
    try {
      const res = await jobworkDcsAPI.dispatch(dc.id);
      setModal(null);
      setDc(res.data.dc);
      load();
    } catch (e) {
      setDispatchError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const openFile = async (path) => {
    try {
      await WebBrowser.openBrowserAsync(`${getApiUrl().replace('/api', '')}${path}`);
    } catch (e) {
      notify('Error', 'Could not open the file.');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Delivery challan" onBack={() => navigation.goBack()} />
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={COLORS.primary} />
      </View>
    );
  }
  if (!dc) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Delivery challan" onBack={() => navigation.goBack()} />
        <View style={styles.content}><ErrorBanner message={error || 'Delivery challan not found.'} /></View>
      </View>
    );
  }

  const open = ['dispatched', 'partially_returned'].includes(dc.status);
  const editable = ['dc_created', 'rejected'].includes(dc.status);
  const eway = dc.eway_requirement;

  return (
    <View style={styles.container}>
      <ScreenHeader title={dc.dc_number} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        <ErrorBanner message={error} />
        {dc.status === 'rejected' ? <ErrorBanner message={`Rejected: ${dc.rejection_reason || 'no reason given'}`} /> : null}

        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>{dc.vendor_name}</Text>
            <StatusBadge status={dc.status} />
          </View>
          <Row label="Vendor GSTIN" value={dc.vendor_gstin} />
          <Row label="Vendor address" value={dc.vendor_address} />
          <Row label="DC date" value={fmtDate(dc.dc_date)} />
          <Row label="Process" value={dc.process} />
          <Row label="Vehicle" value={dc.vehicle_number} />
          <Row label="Weights (loaded / unloaded)" value={`${dc.loaded_vehicle_weight || '-'} / ${dc.unloaded_vehicle_weight || '-'} kg`} />
          <Row label="Total value" value={money(dc.total_value)} />
          <Row label="E-way bill" value={dc.eway_bill_no} />
          {open ? <Row label="Material is at" value={dc.current_location_name || dc.vendor_name} /> : null}
          {dc.dispatched_at ? <Row label="Dispatched" value={fmtDate(dc.dispatched_at)} /> : null}
          <Row label="Created by" value={dc.created_by_name} />
          {dc.approved_by_name ? <Row label="Approved by" value={`${dc.approved_by_name} on ${fmtDate(dc.approved_at)}`} /> : null}
          {dc.attachment_path ? (
            <TouchableOpacity onPress={() => openFile(dc.attachment_path)} style={{ marginTop: 6 }}>
              <Text style={{ color: COLORS.primary, fontWeight: '600' }}>📎 {dc.attachment_name || 'Attachment'}</Text>
            </TouchableOpacity>
          ) : null}
        </Card>

        {isAccountant && dc.status === 'dc_created' && eway ? (
          <ErrorBanner kind={eway.required ? 'error' : 'warning'}
            message={eway.required
              ? `E-way bill number needed to approve:\n• ${eway.reasons.join('\n• ')}`
              : 'E-way bill number is optional for this DC.'} />
        ) : null}

        <Text style={styles.sectionTitle}>Items</Text>
        {dc.items.map((i) => (
          <Card key={i.id}>
            <Text style={styles.hint}>Item chosen by the project manager</Text>
            <Text style={{ fontWeight: '700', fontSize: 15 }}>{i.description}</Text>
            {i.pm_item_code ? <Text style={styles.hint}>Part / drawing no. {i.pm_item_code}{i.item_kind === 'product' ? ' · product being developed' : ''}</Text> : null}
            <Text style={[styles.hint, { marginTop: 4 }]}>Stock item (Tally)</Text>
            <Text style={{ fontWeight: '600' }}>{i.stock_item_name}{i.hsn_code ? ` · HSN ${i.hsn_code}` : ''}</Text>
            <Text style={styles.hint}>{i.project_name || '-'} · {i.job_id}</Text>
            <Row label="Sent" value={`${qty(i.quantity)} ${i.unit}`} />
            <Row label="Returned" value={`${qty(i.returned_quantity)} ${i.unit}`} />
            <Row label="Pending" value={`${qty(Number(i.quantity) - Number(i.returned_quantity))} ${i.unit}`} />
            <Row label="Unit value / total" value={`${money(i.unit_value)} / ${money(i.total_value)}`} />
          </Card>
        ))}

        {dc.movements.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Movements</Text>
            {dc.movements.map((m) => (
              <Card key={m.id}>
                <Text style={{ fontWeight: '600' }}>{m.from_vendor_name} → {m.to_vendor_name}</Text>
                <Text style={styles.hint}>{fmtDate(m.moved_at)}{m.vendor_dc_no ? ` · vendor DC ${m.vendor_dc_no}` : ''}</Text>
                {m.note ? <Text style={styles.hint}>{m.note}</Text> : null}
              </Card>
            ))}
          </View>
        ) : null}

        {dc.returns.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Returns and vendor invoices</Text>
            {dc.returns.map((r) => {
              return (
                <Card key={r.id}>
                  <Text style={{ fontWeight: '700' }}>
                    {r.entry_type === 'return' ? 'Return' : 'Invoice only'} · {r.vendor_name}
                  </Text>
                  <Row label="Invoice" value={r.invoice_no ? `${r.invoice_no} (${fmtDate(r.invoice_date)})` : null} />
                  <Row label="Vendor DC" value={r.vendor_dc_no ? `${r.vendor_dc_no} (${fmtDate(r.vendor_dc_date)})` : null} />
                  <View style={{ marginTop: 6 }}><GstSplitLine row={r} /></View>
                  {r.items && r.items.length ? (
                    <Text style={styles.hint}>
                      Received: {r.items.map((it) => {
                        const item = dc.items.find((d) => d.id === it.dc_item_id);
                        return `${qty(it.quantity_received)} ${item ? item.description : ''}`;
                      }).join(', ')}
                    </Text>
                  ) : null}
                </Card>
              );
            })}
          </View>
        ) : null}

        <View style={{ marginTop: 12, gap: 10 }}>
          <Button title="Print / share delivery challan (PDF)" kind="ghost" onPress={printDc} loading={printing} />
          {isStore && editable ? (
            <Button title={dc.status === 'rejected' ? 'Correct and resubmit' : 'Edit delivery challan'}
              onPress={() => navigation.navigate('JobWorkDCForm', { user, dcId: dc.id })} />
          ) : null}
          {isStore && dc.status === 'approved' ? <Button title="Dispatch" kind="success" onPress={() => { setDispatchError(''); setModal('dispatch'); }} /> : null}
          {isStore && open ? <Button title="Record return" kind="success" onPress={() => navigation.navigate('JobWorkReturn', { user, dcId: dc.id })} /> : null}
          {isStore && open ? <Button title="Move to another vendor" kind="ghost" onPress={() => setModal('move')} /> : null}
          {isStore && (open || dc.status === 'closed') ? <Button title="Record vendor invoice" kind="ghost" onPress={() => setModal('invoice')} /> : null}
          {isAccountant && dc.status === 'dc_created' ? <Button title="Approve" kind="success" onPress={() => setModal('approve')} /> : null}
          {isAccountant && dc.status === 'dc_created' ? <Button title="Reject" kind="danger" onPress={() => setModal('reject')} /> : null}
        </View>
      </ScrollView>

      <ApproveModal visible={modal === 'approve'} dc={dc} onClose={() => setModal(null)} onDone={afterAction('Delivery challan approved. Store can now dispatch it.')} />
      <RejectModal visible={modal === 'reject'} dc={dc} onClose={() => setModal(null)} onDone={afterAction('Rejected. Store has been notified and can correct it.')} />
      <MoveModal visible={modal === 'move'} dc={dc} vendors={vendors} onClose={() => setModal(null)} onDone={afterAction('Move recorded.')} />
      <InvoiceModal visible={modal === 'invoice'} dc={dc} vendors={vendors} onClose={() => setModal(null)} onDone={afterAction('Vendor invoice recorded.')} />
      <ActionModal visible={modal === 'dispatch'} title="Dispatch material" subtitle={`${dc.dc_number} → ${dc.vendor_name}`}
        onClose={() => setModal(null)}
        footer={<>
          <Button title="Cancel" kind="ghost" onPress={() => setModal(null)} disabled={busy} />
          <Button title="Confirm dispatch" kind="success" onPress={dispatchDc} loading={busy} />
        </>}>
        <ErrorBanner message={dispatchError} />
        <Text>The material will be marked as outside the factory, at {dc.vendor_name}. Check the vehicle and documents first.</Text>
      </ActionModal>
      <Footer />
    </View>
  );
}
