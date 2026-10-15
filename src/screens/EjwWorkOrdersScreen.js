import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { ejwAPI } from '../config/api';
import { apiErrorMessage, fmtDate, money, notify } from '../utils/jobwork';
import { WO_STATUS, q3 } from '../utils/ejw';
import { ActionModal, Button, Card, COLORS, ErrorBanner, Field, ScreenHeader, styles } from '../components/jobwork/common';
import { Empty, Loading, Pill, SimplePicker, Tabs, roleOf, useScreenLoad } from '../components/ejw/parts';
import Footer from '../components/Footer';

// PM: "External stock awaiting work" -> pick items of ONE customer -> create a work order; and the list of work orders.
export default function EjwWorkOrdersScreen({ route, navigation }) {
  const { user } = route.params;
  const isPm = roleOf(user) === 'project_manager';
  const [tab, setTab] = useState(route.params.tab || (isPm ? 'awaiting' : 'orders'));
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [picked, setPicked] = useState({}); // item_id -> customer_id
  const [pickError, setPickError] = useState('');
  const [modal, setModal] = useState(false);
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { loading, error, reload } = useScreenLoad(async () => {
    const [a, b] = await Promise.all([ejwAPI.stockAwaitingWork(), ejwAPI.listWorkOrders()]);
    setCustomers(a.data.customers || []);
    setOrders(b.data.work_orders || []);
  });

  const pickedIds = Object.keys(picked).map(Number);
  const pickedCustomer = pickedIds.length ? picked[pickedIds[0]] : null;
  // The projects (jobs) assigned to this PM for the customer whose material is ticked, and only those
  const [targetWo, setTargetWo] = useState('');
  const jobsOfCustomer = orders.filter((w) => w.customer_id === pickedCustomer && w.status !== 'closed');
  const chosenJob = jobsOfCustomer.find((w) => String(w.id) === String(targetWo));

  const toggle = (customer, item) => {
    setPickError('');
    if (item.stock_item_pending) return setPickError('This item is waiting for Accounts to create its stock item. It can go on a work order after that.');
    setPicked((p) => {
      const next = { ...p };
      if (next[item.item_id]) { delete next[item.item_id]; return next; }
      if (pickedCustomer && pickedCustomer !== customer.customer_id) { setPickError('A work order is for one customer. Clear your selection to pick another customer’s material.'); return p; }
      next[item.item_id] = customer.customer_id;
      return next;
    });
    setTargetWo('');
  };

  const addToJob = async () => {
    setPickError('');
    setBusy(true);
    try {
      await ejwAPI.addItemsToWorkOrder(Number(targetWo), pickedIds);
      setPicked({}); setTargetWo('');
      notify('Material added', `The material is now on ${chosenJob ? chosenJob.wo_no : 'the job'}.`);
      navigation.navigate('EjwWorkOrderDetail', { user, woId: Number(targetWo) });
    } catch (e) { setPickError(apiErrorMessage(e, 'Could not add the material to the job.')); } finally { setBusy(false); }
  };

  const create = async () => {
    setFormError('');
    setBusy(true);
    try {
      const r = await ejwAPI.createWorkOrder({ inward_item_ids: pickedIds, description: desc });
      setModal(false); setPicked({}); setDesc('');
      notify('Work order created', `${r.data.work_order.wo_no} is ready. Add the customer PO number and documents on its page.`);
      navigation.navigate('EjwWorkOrderDetail', { user, woId: r.data.work_order.id });
    } catch (e) { setFormError(apiErrorMessage(e, 'Could not create the work order.')); } finally { setBusy(false); }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="External Job Work" onBack={() => navigation.goBack()} />
      <Tabs tabs={[{ key: 'awaiting', label: 'Stock awaiting work' }, { key: 'orders', label: 'Work orders' }]} active={tab} onChange={setTab} />
      <ErrorBanner message={error || pickError} />
      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} />}>
          {tab === 'awaiting' ? (
            customers.length === 0 ? <Empty text="No customer material is waiting for a work order." /> : customers.map((c) => (
              <View key={c.customer_id}>
                <Text style={styles.sectionTitle}>{c.customer_name}</Text>
                {c.inwards.map((inw) => (
                  <Card key={inw.inward_id}>
                    <Text style={{ fontWeight: '700' }}>{inw.inward_no}</Text>
                    <Text style={styles.hint}>
                      {inw.customer_dc_no ? `Customer DC ${inw.customer_dc_no}` : inw.third_party ? `Via ${inw.supplier_name}` : ''}
                      {inw.customer_dc_pending ? '  ·  customer DC still to come' : ''}
                    </Text>
                    {inw.items.map((it) => {
                      const on = !!picked[it.item_id];
                      return (
                        <TouchableOpacity key={it.item_id} onPress={() => isPm && toggle(c, it)} disabled={!isPm}
                          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border, opacity: it.stock_item_pending ? 0.5 : 1 }}>
                          {isPm ? <Text style={{ fontSize: 20, width: 28 }}>{on ? '☑' : '☐'}</Text> : null}
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: '600' }}>{it.description}</Text>
                            <Text style={styles.hint}>
                              {q3(it.pending_qty)} {it.unit} {'·'} HSN {it.hsn || '-'} {'·'} held {it.days_held} day(s) since {fmtDate(it.received_date)}
                              {it.unit_value !== undefined ? ` · ${money(it.unit_value)}/unit` : ''}
                            </Text>
                            {it.stock_item_pending ? <Text style={{ color: COLORS.warn, fontSize: 12 }}>Waiting for the stock item</Text> : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </Card>
                ))}
              </View>
            ))
          ) : (
            orders.length === 0 ? <Empty text="No work orders yet." /> : orders.map((w) => (
              <TouchableOpacity key={w.id} onPress={() => navigation.navigate('EjwWorkOrderDetail', { user, woId: w.id })}>
                <Card>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: '700', fontSize: 15 }}>{w.wo_no}</Text>
                    <Pill meta={WO_STATUS[w.status]} />
                  </View>
                  <Text style={{ marginTop: 2 }}>{w.customer_name}</Text>
                  <Text style={styles.hint}>{w.item_count} item(s) {'·'} {w.pm_name ? `PM ${w.pm_name}` : 'No PM assigned'} {'·'} PO {w.customer_po_no || 'not recorded'}</Text>
                  {w.description ? <Text style={styles.hint} numberOfLines={1}>{w.description}</Text> : null}
                </Card>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
      {isPm && tab === 'awaiting' && pickedIds.length ? (
        <View style={{ padding: 12, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: COLORS.border }}>
          <SimplePicker label="Add to one of your projects (this customer's only)" value={targetWo} onChange={setTargetWo} placeholder="-- New work order --"
            options={jobsOfCustomer.map((w) => ({ value: w.id, label: `${w.wo_no}${w.description ? ` \u00b7 ${w.description.slice(0, 40)}` : ''} (${WO_STATUS[w.status] ? WO_STATUS[w.status].label : w.status})` }))}
            hint={jobsOfCustomer.length === 0 ? 'You have no open project for this customer yet; this will create a new work order.' : undefined} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button style={{ flex: 1 }} title="Clear" kind="ghost" onPress={() => { setPicked({}); setPickError(''); setTargetWo(''); }} />
          {targetWo
            ? <Button style={{ flex: 2 }} title={`Add to ${chosenJob ? chosenJob.wo_no : 'job'} (${pickedIds.length})`} kind="success" onPress={addToJob} loading={busy} />
            : <Button style={{ flex: 2 }} title={`Create new work order (${pickedIds.length})`} onPress={() => setModal(true)} />}
        </View>
        </View>
      ) : null}

      <ActionModal visible={modal} title="Create work order" subtitle={`${pickedIds.length} item(s) of one customer`} onClose={() => setModal(false)}
        footer={<><Button title="Cancel" kind="ghost" onPress={() => setModal(false)} disabled={busy} /><Button title="Create" onPress={create} loading={busy} /></>}>
        <ErrorBanner message={formError} />
        <Field label="What is to be done" value={desc} onChangeText={setDesc} multiline placeholder="e.g. hard chrome plating" hint="Printed on the delivery challan as: Job work — return after ..." />
      </ActionModal>
      <Footer />
    </View>
  );
}
