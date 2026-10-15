import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Picker } from '@react-native-picker/picker';
import { getApiUrl, jobworkDcsAPI, projectsAPI } from '../config/api';
import { apiErrorMessage, fmtDate, money, notify, qty } from '../utils/jobwork';
import { Button, Card, COLORS, ErrorBanner, Row, ScreenHeader, StatusBadge, styles } from '../components/jobwork/common';
import { GstSplitLine } from '../components/jobwork/TaxPreview';
import { SHOW_LEGACY_CHALLAN_UPLOAD } from '../config/features';
import { REQUEST_STATUS } from './StockItemRequestDetailScreen';
import Footer from '../components/Footer';

const TABS = [
  ['pending', 'Pending approval'],
  ['requests', 'Stock item requests'],
  ['all', 'All challans'],
  ['invoices', 'Vendor invoices'],
  ...(SHOW_LEGACY_CHALLAN_UPLOAD ? [['legacy', 'Old challans']] : []),
];

// Accountant's Internal Job Work screen: approve / reject delivery challans, see vendor invoices
// with their GST split, and reach the stock item master. It never loads the company-wide
// external job work list that the previous version of this screen used for non-accountants.
export default function InternalJobWorkScreen({ route, navigation }) {
  const { user } = route.params;
  const [tab, setTab] = useState('pending');
  const [dcs, setDcs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [legacy, setLegacy] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sourceFilter, setSourceFilter] = useState(''); // '' = all, 'stock', 'product'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [d, i, q] = await Promise.all([jobworkDcsAPI.list(), jobworkDcsAPI.getVendorInvoices(), jobworkDcsAPI.listStockItemRequests()]);
      setDcs(d.data.dcs || []);
      setInvoices(i.data.invoices || []);
      setRequests(q.data.requests || []);
      if (SHOW_LEGACY_CHALLAN_UPLOAD) {
        try {
          const l = await projectsAPI.getAccountantJobWork(user.id);
          setLegacy(l.data.requests || []);
        } catch (e) {
          setLegacy([]);
        }
      }
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load job work.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.id]);

  useEffect(() => {
    load();
    return navigation.addListener('focus', load);
  }, [load, navigation]);

  const pending = dcs.filter((d) => d.status === 'dc_created');
  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const pendingBySource = (src) => pendingRequests.filter((r) => r.source === src).length;
  const shownRequests = requests.filter((r) => !sourceFilter || r.source === sourceFilter);
  const openDc = (id) => navigation.navigate('JobWorkDCDetail', { user, dcId: id });

  const viewFile = async (path) => {
    try {
      await WebBrowser.openBrowserAsync(`${getApiUrl().replace('/api', '')}${path}`);
    } catch (e) {
      notify('Error', 'Could not open the file.');
    }
  };

  const dcCard = (d) => (
    <TouchableOpacity key={d.id} onPress={() => openDc(d.id)}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontWeight: '700', fontSize: 16 }}>{d.dc_number}</Text>
          <StatusBadge status={d.status} />
        </View>
        <Text style={{ marginTop: 4 }}>{d.vendor_name}</Text>
        <Text style={styles.hint}>{fmtDate(d.dc_date)} · {d.item_count} item(s) · {money(d.total_value)}</Text>
        {d.projects && d.projects.length ? <Text style={styles.hint}>Projects: {d.projects.join(', ')}</Text> : null}
      </Card>
    </TouchableOpacity>
  );

  // Vendor invoices grouped per delivery challan.
  const invoicesByDc = invoices.reduce((acc, inv) => {
    (acc[inv.dc_number] = acc[inv.dc_number] || []).push(inv);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <ScreenHeader title="Internal Job Work" onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
        <Button title={`Add to stock: choose a request or a product (${pendingRequests.length} pending)`} kind="success" onPress={() => navigation.navigate('CreateStockItem', { user })} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.chipRow}>
        {TABS.map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.chip, tab === key && styles.chipActive]} onPress={() => setTab(key)}>
            <Text style={[styles.chipText, tab === key && styles.chipTextActive]}>
              {label}{key === 'pending' ? ` (${pending.length})` : ''}{key === 'requests' && pendingRequests.length ? ` (${pendingRequests.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={COLORS.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
          <ErrorBanner message={error} />

          {tab === 'pending' ? (
            pending.length === 0
              ? <View style={styles.empty}><Text style={styles.emptyText}>No delivery challans are waiting for approval.</Text></View>
              : pending.map(dcCard)
          ) : null}

          {tab === 'requests' ? (
            <View>
              <Text style={styles.label}>Show</Text>
              <View style={[styles.pickerBox, { marginBottom: 8 }]}>
                <Picker selectedValue={sourceFilter} onValueChange={setSourceFilter}>
                  <Picker.Item label={`All (${pendingRequests.length} pending)`} value="" />
                  <Picker.Item label={`Stock item requests, as before (${pendingBySource('stock')} pending)`} value="stock" />
                  <Picker.Item label={`Products being developed, to add to stock (${pendingBySource('product')} pending)`} value="product" />
                </Picker>
              </View>
              {shownRequests.length === 0
                ? <View style={styles.empty}><Text style={styles.emptyText}>Nothing here.</Text></View>
                : shownRequests.map((r) => {
                  const meta = REQUEST_STATUS[r.status];
                  const c = r.context || {};
                  return (
                    <TouchableOpacity key={r.id} onPress={() => navigation.navigate('StockItemRequestDetail', { user, requestId: r.id })}>
                      <Card style={r.status === 'pending' ? { borderLeftWidth: 4, borderLeftColor: r.source === 'product' ? COLORS.primary : COLORS.warn } : null}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontWeight: '700', fontSize: 15, flex: 1 }}>{r.requested_name}</Text>
                          <View style={[styles.badge, { backgroundColor: meta.color }]}><Text style={styles.badgeText}>{meta.label}</Text></View>
                        </View>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: r.source === 'product' ? COLORS.primary : COLORS.muted, marginTop: 2 }}>
                          {r.source === 'product' ? 'PRODUCT BEING DEVELOPED: add to stock' : 'STOCK ITEM REQUEST'}
                        </Text>
                        <Text style={styles.hint}>{r.requester_name || '-'} ({(r.requester_role || '').replace('_', ' ')}) · {fmtDate(r.created_at)}</Text>
                        {c.item_description ? <Text style={{ fontSize: 13, marginTop: 2 }}>PM's item: {c.item_description}</Text> : null}
                        {c.project_name ? <Text style={styles.hint}>Project {c.project_name}{c.process ? ` · ${c.process}` : ''}</Text> : null}
                        {r.stock_item_name ? <Text style={styles.hint}>→ {r.stock_item_name}</Text> : null}
                      </Card>
                    </TouchableOpacity>
                  );
                })}
            </View>
          ) : null}

          {tab === 'all' ? (
            dcs.length === 0
              ? <View style={styles.empty}><Text style={styles.emptyText}>No delivery challans yet.</Text></View>
              : dcs.map(dcCard)
          ) : null}

          {tab === 'invoices' ? (
            Object.keys(invoicesByDc).length === 0
              ? <View style={styles.empty}><Text style={styles.emptyText}>No vendor invoices recorded yet.</Text></View>
              : Object.entries(invoicesByDc).map(([dcNumber, list]) => (
                <View key={dcNumber}>
                  <Text style={styles.sectionTitle}>{dcNumber}</Text>
                  {list.map((inv) => {
                    return (
                      <TouchableOpacity key={inv.id} onPress={() => openDc(inv.dc_id)}>
                        <Card>
                          <Text style={{ fontWeight: '700' }}>
                            {inv.vendor_name} · {inv.entry_type === 'return' ? 'Return' : 'Invoice only'}
                          </Text>
                          <Row label="Invoice" value={inv.invoice_no ? `${inv.invoice_no} (${fmtDate(inv.invoice_date)})` : null} />
                          <View style={{ marginTop: 6 }}><GstSplitLine row={inv} /></View>
                          {inv.sac_code ? <Row label="SAC" value={inv.sac_code} /> : null}
                        </Card>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))
          ) : null}

          {tab === 'legacy' ? (
            <View>
              <Text style={styles.hint}>Challans uploaded as files before delivery challans existed. Read-only.</Text>
              {legacy.length === 0
                ? <View style={styles.empty}><Text style={styles.emptyText}>No shared challans.</Text></View>
                : legacy.map((r) => (
                  <Card key={r.id}>
                    <Text style={{ fontWeight: '700' }}>{r.job_id}</Text>
                    <Text style={styles.hint}>Project: {r.project_name} · {r.job_work_type}</Text>
                    {(r.items || []).map((it) => (
                      <Text key={it.id} style={styles.hint}>• {it.material_name}: {qty(it.quantity)} {it.unit}</Text>
                    ))}
                    {r.challan_file_path ? (
                      <TouchableOpacity onPress={() => viewFile(r.challan_file_path)} style={{ marginTop: 6 }}>
                        <Text style={{ color: COLORS.primary, fontWeight: '600' }}>📄 {r.challan_file_name || 'View challan'}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </Card>
                ))}
            </View>
          ) : null}
        </ScrollView>
      )}
      <Footer />
    </View>
  );
}
