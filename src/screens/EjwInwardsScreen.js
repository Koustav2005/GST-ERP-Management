import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { ejwAPI } from '../config/api';
import { fmtDate, money } from '../utils/jobwork';
import { Button, Card, ErrorBanner, Field, ScreenHeader, styles, COLORS } from '../components/jobwork/common';
import { Empty, Loading, Pill, Tabs, roleOf, useScreenLoad } from '../components/ejw/parts';
import Footer from '../components/Footer';

const TABS = [{ key: 'all', label: 'All' }, { key: 'open', label: 'Open' }, { key: 'pending', label: 'Customer DC pending' }, { key: 'closed', label: 'Closed' }];

// Customer material received (inwards). Store creates; Accounts and Management read.
export default function EjwInwardsScreen({ route, navigation }) {
  const { user } = route.params;
  const [tab, setTab] = useState('open');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [submitted, setSubmitted] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { loading, error, reload } = useScreenLoad(async () => {
    const params = { ...(tab === 'open' ? { status: 'open' } : tab === 'closed' ? { status: 'closed' } : tab === 'pending' ? { dc_pending: '1' } : {}), ...(submitted ? { search: submitted } : {}) };
    const r = await ejwAPI.listInwards(params);
    setRows(r.data.inwards || []);
  }, [tab, submitted]);
  const sees = roleOf(user);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Customer Material" onBack={() => navigation.goBack()} />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
        <Field placeholder="Search inward no. or customer DC no." value={search} onChangeText={setSearch} onSubmitEditing={() => setSubmitted(search.trim())} returnKeyType="search" />
        {sees === 'store_incharge' ? <Button title="+ Receive customer material" onPress={() => navigation.navigate('EjwInwardForm', { user })} /> : null}
      </View>
      <ErrorBanner message={error} />
      {loading ? <Loading /> : (
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} />}
          ListEmptyComponent={<Empty text="No customer material found." />}
          renderItem={({ item: r }) => (
            <TouchableOpacity onPress={() => navigation.navigate('EjwInwardDetail', { user, inwardId: r.id })}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700', fontSize: 15 }}>{r.inward_no}</Text>
                  <Pill text={r.status === 'closed' ? 'Closed' : 'Open'} meta={{ color: r.status === 'closed' ? COLORS.success : COLORS.primary }} />
                </View>
                <Text style={{ marginTop: 2, fontSize: 14 }}>{r.customer_name}</Text>
                <Text style={styles.hint}>
                  Received {fmtDate(r.received_date)} {'·'} {r.item_count} item(s) {'·'} {r.receipt_count} truck(s)
                </Text>
                <Text style={styles.hint}>
                  {r.customer_dc_no ? `Customer DC ${r.customer_dc_no}${r.customer_dc_date ? ` (${fmtDate(r.customer_dc_date)})` : ''}` : r.third_party ? `Via ${r.supplier_name}` : ''}
                </Text>
                {r.customer_dc_pending ? <Text style={{ color: COLORS.warn, fontWeight: '600', fontSize: 12, marginTop: 3 }}>Customer DC not attached yet: dispatch is blocked</Text> : null}
                {r.total_value !== undefined ? <Text style={[styles.hint, { marginTop: 3 }]}>Declared value {money(r.total_value)}</Text> : null}
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
      <Footer />
    </View>
  );
}
