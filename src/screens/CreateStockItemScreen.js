import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { jobworkDcsAPI } from '../config/api';
import { apiErrorMessage, notify, qty } from '../utils/jobwork';
import { Button, Card, COLORS, ErrorBanner, Field, ScreenHeader, styles } from '../components/jobwork/common';
import Footer from '../components/Footer';

// Accountant only: "Add to stock". Two dropdowns choose what to add:
//   1. a stock item request from Store / a PM (the earlier flow), or
//   2. a product being developed that a PM has sent for job work.
// Picking one fills the form (and shows the PM's item); creating it resolves that request, which fills
// the stock item on the job work items and tells the requester. With nothing picked it adds a plain
// stock item, as before. Also reachable from the notification and the Internal Job Work screen.
export default function CreateStockItemScreen({ route, navigation }) {
  const { user } = route.params;
  const [name, setName] = useState('');
  const [hsn, setHsn] = useState('');
  const [unit, setUnit] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]); // pending only
  const [pickedId, setPickedId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [s, q] = await Promise.all([jobworkDcsAPI.getStockItems(), jobworkDcsAPI.listStockItemRequests({ status: 'pending' })]);
      setItems(s.data.stock_items || []);
      setRequests(q.data.requests || []);
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load stock items.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fromStock = requests.filter((r) => r.source === 'stock');
  const fromProduct = requests.filter((r) => r.source === 'product');
  const picked = requests.find((r) => String(r.id) === String(pickedId));

  const pick = (id) => {
    setError('');
    setPickedId(id);
    const r = requests.find((x) => String(x.id) === String(id));
    if (r) {
      setName(r.requested_name);
      setHsn(r.requested_hsn || '');
      setUnit(r.requested_unit || '');
    } else {
      setName(''); setHsn(''); setUnit('');
    }
  };

  const save = async () => {
    if (!name.trim()) return setError('Item name is required.');
    if (!unit.trim()) return setError('Unit is required (pcs, kg, ...).');
    setError('');
    setSaving(true);
    try {
      const body = { name: name.trim(), hsn: hsn.trim() || undefined, unit: unit.trim() };
      if (picked) {
        const res = await jobworkDcsAPI.createFromStockItemRequest(picked.id, body);
        notify('Added to stock', `"${name.trim()}" is in stock. It was filled in on ${res.data.autofilled_items} job work item(s) and ${picked.requester_name || 'the requester'} has been notified.`);
      } else {
        await jobworkDcsAPI.createStockItem(body);
        notify('Stock item created', `"${name.trim()}" can now be picked on delivery challans.`);
      }
      setPickedId(''); setName(''); setHsn(''); setUnit('');
      load();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not create the stock item.'));
    } finally {
      setSaving(false);
    }
  };

  const label = (r, extra) => `${r.requested_name}${extra ? ` · ${extra}` : ''}`;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Add to stock" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>What do you want to add?</Text>

          <Text style={styles.label}>Stock item requests (from Store / PM)</Text>
          <View style={[styles.pickerBox, { marginBottom: 10 }]}>
            <Picker selectedValue={fromStock.some((r) => String(r.id) === String(pickedId)) ? String(pickedId) : ''} onValueChange={pick}>
              <Picker.Item label={`-- ${fromStock.length} pending: choose one --`} value="" />
              {fromStock.map((r) => <Picker.Item key={r.id} label={label(r, r.customer_name ? `${r.customer_name}${r.customer_dc_no ? `, DC ${r.customer_dc_no}` : ''}` : r.requester_name)} value={String(r.id)} />)}
            </Picker>
          </View>

          <Text style={styles.label}>Products being developed (sent for job work by a PM)</Text>
          <View style={[styles.pickerBox, { marginBottom: 10 }]}>
            <Picker selectedValue={fromProduct.some((r) => String(r.id) === String(pickedId)) ? String(pickedId) : ''} onValueChange={pick}>
              <Picker.Item label={`-- ${fromProduct.length} pending: choose one --`} value="" />
              {fromProduct.map((r) => <Picker.Item key={r.id} label={label(r, r.context && r.context.project_name)} value={String(r.id)} />)}
            </Picker>
          </View>

          {picked ? (
            <Card style={{ backgroundColor: '#FFF9E6', marginHorizontal: 0 }}>
              <Text style={styles.hint}>{picked.source === 'product' ? 'Product being developed' : 'Item chosen by the requester'}</Text>
              <Text style={{ fontWeight: '800', fontSize: 16 }}>{(picked.context && picked.context.item_description) || picked.requested_name}</Text>
              <Text style={styles.hint}>
                {[picked.context && picked.context.quantity ? `${qty(picked.context.quantity)} ${picked.context.unit || ''}`.trim() : null,
                  picked.context && picked.context.project_name ? `Project ${picked.context.project_name}` : null,
                  picked.context && picked.context.drawing_no ? `Part/drawing no. ${picked.context.drawing_no}` : null,
                  picked.context && picked.context.process, picked.requester_name ? `by ${picked.requester_name}` : null].filter(Boolean).join(' · ')}
              </Text>
            </Card>
          ) : (
            <Text style={styles.hint}>Choose one above to fill the form, or type a new stock item below.</Text>
          )}
        </Card>

        <Card>
          <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>Stock item details</Text>
          <ErrorBanner message={error} />
          <ErrorBanner kind="warning" message="Use exactly the same name as in Tally." />
          <Field label="Item name *" value={name} onChangeText={setName} />
          <Field label="HSN" value={hsn} onChangeText={setHsn} />
          <Field label="Unit *" value={unit} onChangeText={setUnit} placeholder="pcs, kg, ..." />
          <Button title={picked ? 'Add to stock and notify' : 'Create stock item'} kind="success" onPress={save} loading={saving} />
          {picked ? <Text style={styles.hint}>To link it to an existing item or reject it, open it from Internal Job Work → Stock item requests.</Text> : null}
        </Card>

        <Text style={styles.sectionTitle}>Existing stock items ({items.length})</Text>
        {loading ? <ActivityIndicator color={COLORS.primary} /> : null}
        {items.map((s) => (
          <Card key={s.id}>
            <Text style={{ fontWeight: '600' }}>{s.name}</Text>
            <Text style={styles.hint}>HSN {s.hsn || '-'} · unit {s.unit}</Text>
          </Card>
        ))}
      </ScrollView>
      <Footer />
    </View>
  );
}
