import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, RefreshControl } from 'react-native';
import { masterCustomersAPI } from '../config/api';
import { apiErrorMessage, notify } from '../utils/jobwork';
import { ActionModal, Button, Card, COLORS, ErrorBanner, Field, ScreenHeader, styles } from '../components/jobwork/common';
import { Empty, Loading, useScreenLoad } from '../components/ejw/parts';
import Footer from '../components/Footer';

const blank = { name: '', gstin: '', billing_address: '', works_address: '', state: '', email: '', phone: '', is_active: true };

// Customer master: the owners of the material we process. Accounts and Management maintain it.
// The GSTIN decides the state (first two digits), which decides CGST+SGST vs IGST and the e-way rule.
export default function EjwCustomersScreen({ route, navigation }) {
  const { user } = route.params;
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [editing, setEditing] = useState(null); // null | { id?, ...fields }
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // inactive customers can be shown too, so they can be reactivated
  const [showInactive, setShowInactive] = useState(false);
  const { loading, error, reload } = useScreenLoad(async () => {
    const r = await masterCustomersAPI.getAll(showInactive ? { include_inactive: '1' } : undefined);
    setRows(r.data.customers || []);
  }, [showInactive]);

  const shown = rows.filter((c) => (showInactive || c.is_active) && (!submitted || `${c.name} ${c.gstin || ''}`.toLowerCase().includes(submitted.toLowerCase())));

  const save = async () => {
    setFormError(''); setBusy(true);
    const { id, ...fields } = editing;
    try {
      if (id) await masterCustomersAPI.update(id, fields); else await masterCustomersAPI.create(fields);
      setEditing(null);
      await reload();
      notify('Saved', `${fields.name} saved.`);
    } catch (e) { setFormError(apiErrorMessage(e, 'Could not save the customer.')); } finally { setBusy(false); }
  };
  const remove = async () => {
    setFormError(''); setBusy(true);
    try { await masterCustomersAPI.remove(editing.id); setEditing(null); await reload(); } catch (e) { setFormError(apiErrorMessage(e)); } finally { setBusy(false); }
  };
  const set = (patch) => setEditing({ ...editing, ...patch });

  return (
    <View style={styles.container}>
      <ScreenHeader title="Customer Master" onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
        <Field placeholder="Search name or GSTIN" value={search} onChangeText={setSearch} onSubmitEditing={() => setSubmitted(search.trim())} returnKeyType="search" />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Button title="+ Add customer" onPress={() => { setFormError(''); setEditing({ ...blank }); }} />
          <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={styles.hint}>Show inactive </Text><Switch value={showInactive} onValueChange={setShowInactive} /></View>
        </View>
      </View>
      <ErrorBanner message={error} />
      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} />}>
          {shown.length === 0 ? <Empty text="No customers." /> : shown.map((c) => (
            <TouchableOpacity key={c.id} onPress={() => { setFormError(''); setEditing({ ...blank, ...Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v === null ? '' : v])) }); }}>
              <Card style={{ opacity: c.is_active ? 1 : 0.55 }}>
                <Text style={{ fontWeight: '700', fontSize: 15 }}>{c.name}{c.is_active ? '' : '  (inactive)'}</Text>
                <Text style={styles.hint}>GSTIN {c.gstin || 'not set'} {'·'} {c.state || 'state not set'}</Text>
                {!c.gstin && !c.state ? <Text style={{ color: COLORS.warn, fontSize: 12 }}>No GSTIN or state: invoices cannot be calculated for this customer</Text> : null}
                {c.email ? <Text style={styles.hint}>{c.email}{c.phone ? ` · ${c.phone}` : ''}</Text> : null}
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ActionModal visible={!!editing} title={editing && editing.id ? 'Edit customer' : 'New customer'} onClose={() => setEditing(null)}
        footer={<>
          {editing && editing.id ? <Button title="Delete" kind="danger" onPress={remove} disabled={busy} /> : null}
          <Button title="Cancel" kind="ghost" onPress={() => setEditing(null)} disabled={busy} />
          <Button title="Save" onPress={save} loading={busy} />
        </>}>
        <ErrorBanner message={formError} />
        {editing ? (
          <>
            <Field label="Name *" value={editing.name} onChangeText={(t) => set({ name: t })} />
            <Field label="GSTIN" value={editing.gstin} autoCapitalize="characters" maxLength={15} onChangeText={(t) => set({ gstin: t.toUpperCase() })} hint="The first two digits set the state used for CGST+SGST / IGST." />
            <Field label="State" value={editing.state} onChangeText={(t) => set({ state: t })} hint="Filled from the GSTIN when you save." />
            <Field label="Billing address (on the invoice)" value={editing.billing_address} onChangeText={(t) => set({ billing_address: t })} multiline />
            <Field label="Works address (on the delivery challan)" value={editing.works_address} onChangeText={(t) => set({ works_address: t })} multiline />
            <Field label="Email" value={editing.email} keyboardType="email-address" autoCapitalize="none" onChangeText={(t) => set({ email: t })} />
            <Field label="Phone" value={editing.phone} keyboardType="phone-pad" onChangeText={(t) => set({ phone: t })} />
            {editing.id ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.label}>Active</Text><Switch value={!!editing.is_active} onValueChange={(v) => set({ is_active: v })} />
              </View>
            ) : null}
          </>
        ) : null}
      </ActionModal>
      <Footer />
    </View>
  );
}
