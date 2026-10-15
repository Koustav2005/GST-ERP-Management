import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { ejwAPI } from '../config/api';
import { fmtDate, money } from '../utils/jobwork';
import { DISPATCH_STATUS, q3 } from '../utils/ejw';
import { Button, Card, ErrorBanner, ScreenHeader, styles } from '../components/jobwork/common';
import { Blockers, Empty, Loading, Pill, Tabs, roleOf, useScreenLoad } from '../components/ejw/parts';
import Footer from '../components/Footer';

const TABS = [{ key: 'ready', label: 'Ready for dispatch' }, { key: 'draft', label: 'Drafts' }, { key: 'issued', label: 'Issued' }, { key: 'cancelled', label: 'Cancelled' }];

// Accounts: work orders with Store-confirmed material, and the dispatches made from them.
export default function EjwDispatchesScreen({ route, navigation }) {
  const { user } = route.params;
  const isAccounts = roleOf(user) === 'accountant';
  const [tab, setTab] = useState('ready');
  const [ready, setReady] = useState([]);
  const [list, setList] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const { loading, error, reload } = useScreenLoad(async () => {
    if (tab === 'ready') setReady((await ejwAPI.readyForDispatch()).data.work_orders || []);
    else setList((await ejwAPI.listDispatches({ status: tab })).data.dispatches || []);
  }, [tab]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Dispatch" onBack={() => navigation.goBack()} />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <ErrorBanner message={error} />
      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} />}>
          {tab === 'ready' ? (
            ready.length === 0 ? <Empty text="No work order has material confirmed ready by Store." /> : ready.map((w) => (
              <Card key={w.wo_id}>
                <Text style={{ fontWeight: '700', fontSize: 15 }}>{w.wo_no} {'·'} {w.customer_name}</Text>
                <Text style={styles.hint}>PO {w.customer_po_no || 'not recorded'}{w.draft_count ? ` · ${w.draft_count} draft(s)` : ''}</Text>
                {w.items.map((i) => (
                  <Text key={i.item_id} style={{ fontSize: 13, paddingVertical: 2 }}>{'•'} {i.description}: {q3(i.dispatchable_qty)} {i.unit} ready{i.customer_dc_pending ? ' (customer DC pending)' : ''}</Text>
                ))}
                <Blockers items={w.blockers} />
                {isAccounts ? <Button style={{ marginTop: 8 }} title="Prepare dispatch" onPress={() => navigation.navigate('EjwDispatchForm', { user, woId: w.wo_id })} /> : null}
              </Card>
            ))
          ) : (
            list.length === 0 ? <Empty text="Nothing here yet." /> : list.map((d) => (
              <TouchableOpacity key={d.id} onPress={() => navigation.navigate('EjwDispatchDetail', { user, dispatchId: d.id })}>
                <Card>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: '700' }}>{d.dc_no || `Draft #${d.id}`}</Text>
                    <Pill meta={DISPATCH_STATUS[d.status]} />
                  </View>
                  <Text>{d.customer_name} {'·'} {d.wo_no}</Text>
                  <Text style={styles.hint}>{d.invoice_no ? `Invoice ${d.invoice_no} · ` : ''}{d.dc_date ? fmtDate(d.dc_date) : fmtDate(d.created_at)}</Text>
                  {d.invoice_total !== undefined ? <Text style={styles.hint}>Invoice total {money(d.invoice_total)}</Text> : <Text style={styles.hint}>Goods value {money(d.component_value)}</Text>}
                </Card>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
      <Footer />
    </View>
  );
}
