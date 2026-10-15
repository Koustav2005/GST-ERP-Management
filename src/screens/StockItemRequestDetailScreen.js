import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { jobworkDcsAPI } from '../config/api';
import { apiErrorMessage, fmtDate, notify, qty } from '../utils/jobwork';
import { Button, Card, COLORS, ErrorBanner, Field, Row, ScreenHeader, styles } from '../components/jobwork/common';
import { StockItemPicker } from '../components/jobwork/Pickers';
import Footer from '../components/Footer';

export const REQUEST_STATUS = {
  pending: { label: 'Pending', color: COLORS.warn },
  created: { label: 'Created', color: COLORS.success },
  linked: { label: 'Linked', color: COLORS.primary },
  rejected: { label: 'Rejected', color: COLORS.danger },
};

// One stock item request with everything the accountant needs to decide, the existing items
// with similar names, and the three actions: link to existing, create new, reject.
export default function StockItemRequestDetailScreen({ route, navigation }) {
  const { user, requestId } = route.params;
  const isAccountant = user.role === 'accountant';

  const [request, setRequest] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(null); // link | create | reject
  const [linkId, setLinkId] = useState('');
  const [name, setName] = useState('');
  const [hsn, setHsn] = useState('');
  const [unit, setUnit] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([jobworkDcsAPI.getStockItemRequest(requestId), jobworkDcsAPI.getStockItems()]);
      setRequest(r.data.request);
      setSimilar(r.data.similar_items || []);
      setAllItems(s.data.stock_items || []);
      setName(r.data.request.requested_name);
      setHsn(r.data.request.requested_hsn || '');
      setUnit(r.data.request.requested_unit || '');
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load this request.'));
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (fn, doneMessage) => {
    setError('');
    setBusy(true);
    try {
      await fn();
      notify('Done', doneMessage);
      navigation.goBack();
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const link = (stockItemId) => {
    if (!stockItemId) return setError('Choose the stock item to link to.');
    return resolve(() => jobworkDcsAPI.linkStockItemRequest(request.id, Number(stockItemId)),
      'Linked. The stock item is filled in on the requester\'s item and they have been notified.');
  };
  const create = () => {
    if (!name.trim()) return setError('Item name is required.');
    if (!unit.trim()) return setError('Unit is required.');
    return resolve(() => jobworkDcsAPI.createFromStockItemRequest(request.id, { name: name.trim(), hsn: hsn.trim() || undefined, unit: unit.trim() }),
      'Stock item created and filled in on the requester\'s item. They have been notified.');
  };
  const reject = () => {
    if (!reason.trim()) return setError('A reason is required so the requester knows what to do.');
    return resolve(() => jobworkDcsAPI.rejectStockItemRequest(request.id, reason.trim()), 'Rejected. The requester has been notified.');
  };

  if (loading || !request) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Stock item request" onBack={() => navigation.goBack()} />
        {loading ? <ActivityIndicator style={{ marginTop: 40 }} size="large" color={COLORS.primary} /> : <View style={styles.content}><ErrorBanner message={error} /></View>}
      </View>
    );
  }

  const c = request.context || {};
  const w = c.weights || {};
  const meta = REQUEST_STATUS[request.status];
  const pending = request.status === 'pending';

  return (
    <View style={styles.container}>
      <ScreenHeader title={`Request #${request.id}`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={error} />
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', flex: 1 }}>{request.requested_name}</Text>
            <View style={[styles.badge, { backgroundColor: meta.color }]}><Text style={styles.badgeText}>{meta.label}</Text></View>
          </View>
          <Row label="Requested by" value={`${request.requester_name || '-'} (${(request.requester_role || '').replace('_', ' ')})`} />
          <Row label="Requested on" value={fmtDate(request.created_at)} />
          <Row label="HSN / unit asked for" value={`${request.requested_hsn || '-'} / ${request.requested_unit || '-'}`} />
          {request.note ? <Row label="Note" value={request.note} /> : null}
        </Card>

        {/* The item the project manager chose, kept in view while the accountant decides */}
        <Card style={{ backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: COLORS.header }}>
          <Text style={styles.hint}>{request.source === 'product' ? 'Product being developed in this project, sent for job work: add it to stock' : 'Item chosen by the project manager'}</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', marginTop: 2 }}>{c.item_description || request.requested_name}</Text>
          <Text style={styles.hint}>
            {[c.quantity ? `${qty(c.quantity)} ${c.unit || ''}`.trim() : null, c.project_name ? `Project ${c.project_name}` : null, c.process]
              .filter(Boolean).join(' · ')}
          </Text>
        </Card>

        <Text style={styles.sectionTitle}>Context</Text>
        <Card>
          {c.customer_name ? <Row label="Customer" value={c.customer_name} /> : null}
          {c.customer_dc_no ? <Row label="Customer DC" value={`${c.customer_dc_no}${c.customer_dc_date ? ` dated ${c.customer_dc_date}` : ''}`} /> : null}
          {c.supplier_name ? <Row label="Sent by (third party)" value={`${c.supplier_name}${c.supplier_dc_no ? `, DC ${c.supplier_dc_no}` : ''}`} /> : null}
          {c.inward_no ? <Row label="Inward" value={c.inward_no} /> : null}
          {c.hsn_declared ? <Row label="HSN on the customer DC" value={c.hsn_declared} /> : null}
          <Row label="Project" value={c.project_name} />
          <Row label="Customer PO no." value={c.customer_po_no} />
          <Row label="Item description (from PM)" value={c.item_description} />
          <Row label="Drawing / part no." value={c.drawing_no} />
          <Row label="Process" value={c.process} />
          {c.quantity ? <Row label="Quantity" value={`${qty(c.quantity)} ${c.unit || ''}`} /> : null}
          {w.actual || w.loaded ? <Row label="Weight (loaded / unloaded / actual)" value={`${w.loaded ?? '-'} / ${w.unloaded ?? '-'} / ${w.actual ?? '-'} kg`} /> : null}
          <Row label="Job work request" value={c.job_id} />
          {c.dc_number ? <Row label="Delivery challan" value={c.dc_number} /> : null}
        </Card>

        {!pending ? (
          <Card>
            <Text style={{ fontWeight: '700' }}>
              {request.status === 'rejected' ? `Rejected: ${request.reason}` : `${meta.label}: ${request.stock_item_name || ''}`}
            </Text>
            <Text style={styles.hint}>By {request.resolved_by_name || '-'} on {fmtDate(request.resolved_at)}</Text>
          </Card>
        ) : null}

        {pending && isAccountant ? (
          <View>
            <Text style={styles.sectionTitle}>Existing items with a similar name</Text>
            {similar.length === 0 ? <Text style={styles.hint}>None found.</Text> : null}
            {similar.map((s) => (
              <Card key={s.id}>
                <Text style={{ fontWeight: '600' }}>{s.name}</Text>
                <Text style={styles.hint}>HSN {s.hsn || '-'} · unit {s.unit}</Text>
                <Button title="Link to this item" kind="ghost" onPress={() => link(s.id)} loading={busy} style={{ marginTop: 8 }} />
              </Card>
            ))}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Button title="Link to existing" kind={mode === 'link' ? 'primary' : 'ghost'} onPress={() => setMode('link')} style={{ flex: 1 }} />
              <Button title="Create new" kind={mode === 'create' ? 'primary' : 'ghost'} onPress={() => setMode('create')} style={{ flex: 1 }} />
              <Button title="Reject" kind={mode === 'reject' ? 'danger' : 'ghost'} onPress={() => setMode('reject')} style={{ flex: 1 }} />
            </View>

            {mode === 'link' ? (
              <Card>
                <Text style={styles.label}>Link to any stock item</Text>
                <StockItemPicker items={allItems} value={linkId} onChange={setLinkId} />
                <Button title="Link" onPress={() => link(linkId)} loading={busy} style={{ marginTop: 10 }} />
              </Card>
            ) : null}
            {mode === 'create' ? (
              <Card>
                <ErrorBanner kind="warning" message={request.source === 'product' ? 'This adds the product to stock. Use exactly the same name as in Tally.' : 'Use exactly the same name as in Tally.'} />
                <Field label="Item name *" value={name} onChangeText={setName} />
                <Field label="HSN" value={hsn} onChangeText={setHsn} />
                <Field label="Unit *" value={unit} onChangeText={setUnit} placeholder="pcs, kg, ..." />
                <Button title="Create stock item" kind="success" onPress={create} loading={busy} />
              </Card>
            ) : null}
            {mode === 'reject' ? (
              <Card>
                <Field label="Reason *" value={reason} onChangeText={setReason} multiline placeholder="e.g. use the existing item ..." />
                <Button title="Reject request" kind="danger" onPress={reject} loading={busy} />
              </Card>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      <Footer />
    </View>
  );
}
