import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { jobworkDcsAPI, masterVendorsAPI, projectsAPI } from '../config/api';
import { apiErrorMessage, fmtDate, money, qty } from '../utils/jobwork';
import { Button, Card, COLORS, ErrorBanner, ScreenHeader, StatusBadge, styles } from '../components/jobwork/common';
import DateField from '../components/jobwork/DateField';
import Footer from '../components/Footer';

const OVERDUE_DAYS = 30; // out for longer than this is highlighted

// "Material outside factory": every open delivery challan with where it is, since when, how long,
// and what is still pending. For Store, Accountant and Management.
export default function MaterialOutsideScreen({ route, navigation }) {
  const { user } = route.params;
  const canOpenDc = ['store_incharge', 'accountant'].includes(user.role);

  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [vendorId, setVendorId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [report, setReport] = useState({ summary: { open_dcs: 0, pending_value: 0 }, dcs: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    masterVendorsAPI.getAll().then((r) => setVendors(r.data || [])).catch(() => {});
    projectsAPI.getByCompany(user.company_id).then((r) => setProjects(r.data.projects || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      setError('');
      const params = {};
      if (vendorId) params.vendor_id = vendorId;
      if (projectId) params.project_id = projectId;
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await jobworkDcsAPI.getOutsideReport(params);
      setReport(res.data);
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load the report.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vendorId, projectId, from, to]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const rows = useMemo(
    () => report.dcs.filter((d) => !onlyOverdue || d.days_out > OVERDUE_DAYS),
    [report, onlyOverdue]
  );
  const overdueCount = report.dcs.filter((d) => d.days_out > OVERDUE_DAYS).length;

  // Pending quantity cannot be added across units, so total it per unit.
  const pendingByUnit = useMemo(() => {
    const totals = {};
    rows.forEach((d) => (d.pending_items || []).forEach((i) => {
      totals[i.unit] = (totals[i.unit] || 0) + Number(i.pending);
    }));
    return Object.entries(totals).map(([unit, n]) => `${qty(Math.round(n * 1000) / 1000)} ${unit}`).join(', ') || '-';
  }, [rows]);
  const pendingValue = rows.reduce((sum, d) => sum + Math.round(Number(d.pending_value) * 100), 0) / 100;

  const clearFilters = () => { setVendorId(''); setProjectId(''); setFrom(''); setTo(''); setOnlyOverdue(false); };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Material outside factory" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        <ErrorBanner message={error} />

        <Card>
          <Text style={styles.label}>Vendor (where it is now)</Text>
          <View style={[styles.pickerBox, { marginBottom: 10 }]}>
            <Picker selectedValue={vendorId} onValueChange={setVendorId}>
              <Picker.Item label="All vendors" value="" />
              {vendors.map((v) => <Picker.Item key={v.id} label={v.name} value={String(v.id)} />)}
            </Picker>
          </View>
          <Text style={styles.label}>Project</Text>
          <View style={[styles.pickerBox, { marginBottom: 10 }]}>
            <Picker selectedValue={projectId} onValueChange={setProjectId}>
              <Picker.Item label="All projects" value="" />
              {projects.map((p) => <Picker.Item key={p.id} label={p.name} value={String(p.id)} />)}
            </Picker>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <DateField style={{ flex: 1 }} label="Dispatched from" value={from} onChange={setFrom} optional />
            <DateField style={{ flex: 1 }} label="Dispatched to" value={to} onChange={setTo} optional />
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title={`Out more than ${OVERDUE_DAYS} days (${overdueCount})`} kind={onlyOverdue ? 'danger' : 'ghost'}
              onPress={() => setOnlyOverdue((v) => !v)} style={{ flex: 1 }} />
            <Button title="Clear" kind="ghost" onPress={clearFilters} />
          </View>
        </Card>

        <Card style={{ backgroundColor: '#F2F8FF' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View><Text style={styles.hint}>Open challans</Text><Text style={{ fontSize: 20, fontWeight: '700' }}>{rows.length}</Text></View>
            <View><Text style={styles.hint}>Pending quantity</Text><Text style={{ fontSize: 16, fontWeight: '700' }}>{pendingByUnit}</Text></View>
            <View><Text style={styles.hint}>Pending value</Text><Text style={{ fontSize: 20, fontWeight: '700' }}>{money(pendingValue)}</Text></View>
          </View>
        </Card>

        {loading ? <ActivityIndicator style={{ marginTop: 30 }} size="large" color={COLORS.primary} /> : null}
        {!loading && rows.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyText}>No material is outside the factory for these filters.</Text></View>
        ) : null}

        {rows.map((d) => {
          const overdue = d.days_out > OVERDUE_DAYS;
          return (
            <TouchableOpacity key={d.id} disabled={!canOpenDc} onPress={() => navigation.navigate('JobWorkDCDetail', { user, dcId: d.id })}>
              <Card style={overdue ? { borderWidth: 2, borderColor: COLORS.danger } : null}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700', fontSize: 16 }}>{d.dc_number}</Text>
                  <StatusBadge status={d.status} />
                </View>
                <Text style={{ marginTop: 4, fontWeight: '600' }}>At {d.current_location_name || d.vendor_name}</Text>
                {d.current_location_vendor_id !== d.vendor_id ? <Text style={styles.hint}>Originally sent to {d.vendor_name}</Text> : null}
                <Text style={[{ marginTop: 4, fontWeight: '700' }, overdue && { color: COLORS.danger }]}>
                  {overdue ? '⚠ ' : ''}Out {d.days_out} day{d.days_out === 1 ? '' : 's'} (dispatched {fmtDate(d.dispatched_at)})
                </Text>
                <Text style={styles.hint}>At this vendor since {fmtDate(d.location_since)}</Text>
                {d.projects && d.projects.length ? <Text style={styles.hint}>Projects: {d.projects.join(', ')}</Text> : null}
                <View style={{ marginTop: 6 }}>
                  {(d.pending_items || []).map((i, idx) => (
                    <Text key={idx} style={{ fontSize: 13 }}>• {i.description}: {qty(i.pending)} {i.unit} pending (sent {qty(i.sent)}, back {qty(i.returned)})</Text>
                  ))}
                </View>
                <Text style={[styles.hint, { marginTop: 4 }]}>Pending value {money(d.pending_value)}</Text>
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <Footer />
    </View>
  );
}
