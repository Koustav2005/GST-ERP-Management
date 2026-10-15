import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { jobworkDcsAPI } from '../config/api';
import { apiErrorMessage, fmtDate, money, qty } from '../utils/jobwork';
import { Button, Card, COLORS, ErrorBanner, ScreenHeader, StatusBadge, styles } from '../components/jobwork/common';
import Footer from '../components/Footer';

const STATUS_TABS = [
  ['dc_created', 'Created'],
  ['rejected', 'Rejected'],
  ['approved', 'Approved'],
  ['dispatched', 'Dispatched'],
  ['partially_returned', 'Partially returned'],
  ['closed', 'Closed'],
];

export default function JobWorkOutwardScreen({ route, navigation }) {
  const { user } = route.params;
  const [tab, setTab] = useState('pending'); // pending | dcs
  const [statusTab, setStatusTab] = useState('dc_created');
  const [projects, setProjects] = useState([]);
  const [dcs, setDcs] = useState([]);
  const [selected, setSelected] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [p, d] = await Promise.all([jobworkDcsAPI.getPendingItems(), jobworkDcsAPI.list()]);
      setProjects(p.data.projects || []);
      setDcs(d.data.dcs || []);
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load job work.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [load, navigation]);

  const allItems = useMemo(() => projects.flatMap((p) => p.items), [projects]);
  const selectedItems = allItems.filter((i) => selected[i.job_work_item_id]);
  const selectedProjects = new Set(selectedItems.map((i) => i.project_id)).size;
  const toggle = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const countFor = (status) => dcs.filter((d) => d.status === status).length;
  const visibleDcs = dcs.filter((d) => d.status === statusTab);

  const startDc = () => navigation.navigate('JobWorkDCForm', { user, selectedItems });

  return (
    <View style={styles.container}>
      <ScreenHeader title="Job Work – Outward" onBack={() => navigation.goBack()} />
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'pending' && styles.tabActive]} onPress={() => setTab('pending')}>
          <Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>Pending items ({allItems.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'dcs' && styles.tabActive]} onPress={() => setTab('dcs')}>
          <Text style={[styles.tabText, tab === 'dcs' && styles.tabTextActive]}>Delivery challans ({dcs.length})</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={COLORS.primary} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
          <ErrorBanner message={error} />

          {tab === 'pending' ? (
            <View>
              {projects.length > 1 ? (
                <ErrorBanner kind="warning"
                  message={`Items from ${projects.length} projects are waiting. Tick items from several projects to send them to the same vendor on one truck, on a single DC.`} />
              ) : null}
              {projects.length === 0 ? (
                <View style={styles.empty}><Text style={styles.emptyText}>Nothing is waiting for a delivery challan.</Text></View>
              ) : null}
              {projects.map((p) => (
                <View key={String(p.project_id)}>
                  <Text style={styles.sectionTitle}>{p.project_name || 'No project'} ({p.items.length})</Text>
                  {p.items.map((i) => {
                    const on = !!selected[i.job_work_item_id];
                    return (
                      <TouchableOpacity key={i.job_work_item_id} activeOpacity={0.7} onPress={() => toggle(i.job_work_item_id)}>
                        <Card style={on ? { borderWidth: 2, borderColor: COLORS.primary } : null}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <Text style={{ fontSize: 22, marginRight: 10 }}>{on ? '☑' : '☐'}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontWeight: '700', fontSize: 15 }}>{i.material_name}</Text>
                              <Text style={styles.hint}>
                                {qty(i.quantity)} {i.unit} · {i.job_id} · {i.job_work_type}
                              </Text>
                              <Text style={styles.hint}>Requested by {i.requested_by || '-'} on {fmtDate(i.created_at)}</Text>
                              {i.item_kind === 'product' ? <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>Product being developed{i.item_code ? ` · Part no. ${i.item_code}` : ''}</Text> : null}
                              {i.stock_item_name ? null : (
                                <Text style={{ color: COLORS.warn, fontSize: 12, marginTop: 3 }}>No stock item yet: you can request one on the next screen</Text>
                              )}
                            </View>
                          </View>
                        </Card>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          ) : (
            <View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {STATUS_TABS.map(([key, label]) => (
                  <TouchableOpacity key={key} style={[styles.chip, statusTab === key && styles.chipActive]} onPress={() => setStatusTab(key)}>
                    <Text style={[styles.chipText, statusTab === key && styles.chipTextActive]}>{label} ({countFor(key)})</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {visibleDcs.length === 0 ? (
                <View style={styles.empty}><Text style={styles.emptyText}>No delivery challans in this status.</Text></View>
              ) : null}
              {visibleDcs.map((d) => (
                <TouchableOpacity key={d.id} onPress={() => navigation.navigate('JobWorkDCDetail', { user, dcId: d.id })}>
                  <Card>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontWeight: '700', fontSize: 16 }}>{d.dc_number}</Text>
                      <StatusBadge status={d.status} />
                    </View>
                    <Text style={{ marginTop: 4 }}>{d.vendor_name}</Text>
                    <Text style={styles.hint}>
                      {fmtDate(d.dc_date)} · {d.item_count} item(s) · {money(d.total_value)}
                    </Text>
                    {d.projects && d.projects.length ? <Text style={styles.hint}>Projects: {d.projects.join(', ')}</Text> : null}
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {tab === 'pending' && selectedItems.length > 0 ? (
        <View style={{ padding: 12, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: COLORS.border }}>
          <Text style={[styles.hint, { marginBottom: 6 }]}>
            {selectedItems.length} item(s) from {selectedProjects} project(s) selected
          </Text>
          <Button title={`Create delivery challan (${selectedItems.length})`} onPress={startDc} />
        </View>
      ) : null}
      <Footer />
    </View>
  );
}
