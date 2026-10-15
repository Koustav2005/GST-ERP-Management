import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { ejwAPI, masterCustomersAPI } from '../config/api';
import { fmtDate, money, today } from '../utils/jobwork';
import { WO_STATUS, q3 } from '../utils/ejw';
import { Card, COLORS, ErrorBanner, ScreenHeader, styles } from '../components/jobwork/common';
import DateField from '../components/jobwork/DateField';
import { Empty, KV, Loading, Pill, SimplePicker, Tabs, roleOf, useScreenLoad } from '../components/ejw/parts';
import Footer from '../components/Footer';

// Reports. Money columns are removed by the server for roles that must not see them (Store: only the value of the
// customer's material; PM and NPD: no money), so every column below is shown only when it arrives.
export default function EjwReportsScreen({ route, navigation }) {
  const { user } = route.params;
  const role = roleOf(user);
  const canInvoices = role === 'accountant' || role === 'management';
  const tabs = [
    { key: 'material-inside', label: 'Inside factory' },
    { key: 'stock-as-of', label: 'Stock as of date' },
    { key: 'open-customer-dcs', label: 'Open customer DCs' },
    { key: 'work-orders', label: 'Work orders' },
    ...(canInvoices ? [{ key: 'invoices', label: 'Invoices' }] : []),
  ];
  const [tab, setTab] = useState(route.params.tab || 'material-inside');
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [asOf, setAsOf] = useState(today());
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState({ rows: [] });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { masterCustomersAPI.getAll().then((r) => setCustomers(r.data.customers || [])).catch(() => {}); }, []);

  const { loading, error, reload } = useScreenLoad(async () => {
    const params = {};
    if (customerId && tab !== 'invoices') params.customer_id = customerId;
    if (tab === 'stock-as-of') params.date = asOf;
    if (tab === 'invoices') { if (from) params.from = from; if (to) params.to = to; }
    const r = await ejwAPI.report(tab, params);
    setData(r.data);
  }, [tab, customerId, asOf, from, to]);

  const rows = data.rows || [];
  return (
    <View style={styles.container}>
      <ScreenHeader title="External Job Work Reports" onBack={() => navigation.goBack()} />
      <Tabs tabs={tabs} active={tab} onChange={(t) => { setData({ rows: [] }); setTab(t); }} />
      <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
        {tab !== 'invoices' && tab !== 'work-orders' ? (
          <SimplePicker label="Customer" value={customerId} onChange={setCustomerId} placeholder="All customers" options={customers.map((c) => ({ value: c.id, label: c.name }))} />
        ) : null}
        {tab === 'stock-as-of' ? <DateField label="As of (end of day)" value={asOf} onChange={setAsOf} /> : null}
        {tab === 'invoices' ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <DateField style={{ flex: 1 }} label="From" value={from} onChange={setFrom} optional />
            <DateField style={{ flex: 1 }} label="To" value={to} onChange={setTo} optional />
          </View>
        ) : null}
      </View>
      <ErrorBanner message={error} />
      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} />}>
          {tab === 'invoices' && data.totals ? (
            <Card>
              <Text style={styles.label}>Totals (issued invoices)</Text>
              <KV label="Taxable value" value={money(data.totals.taxable_value)} />
              <KV label="CGST" value={money(data.totals.cgst_amount)} />
              <KV label="SGST" value={money(data.totals.sgst_amount)} />
              <KV label="IGST" value={money(data.totals.igst_amount)} />
              <KV label="Invoice total" value={money(data.totals.invoice_total)} bold />
            </Card>
          ) : null}
          {rows.length === 0 ? <Empty text="Nothing to show." /> : rows.map((r, n) => {
            if (tab === 'material-inside' || tab === 'stock-as-of') {
              const inside = tab === 'material-inside' ? r.inside_qty : r.inside_qty;
              return (
                <Card key={`${r.item_id}-${n}`}>
                  <Text style={{ fontWeight: '700' }}>{r.description}</Text>
                  <Text style={styles.hint}>{r.customer_name} {'·'} {r.inward_no} {'·'} customer DC {r.customer_dc_no || '-'} {'·'} HSN {r.hsn || '-'}</Text>
                  <Text style={{ fontWeight: '700', marginTop: 4 }}>{q3(inside)} {r.unit} inside{r.days_held !== undefined ? ` · held ${r.days_held} day(s)` : ''}</Text>
                  {tab === 'material-inside' ? <Text style={styles.hint}>Received {q3(r.qty)} {'·'} issued {q3(r.issued_qty)} {'·'} ready {q3(r.ready_qty)} {'·'} returned {q3(r.returned_qty)}{r.wo_no ? ` · ${r.wo_no}` : ''}</Text> : null}
                  {r.pending_value !== undefined ? <Text style={styles.hint}>Value of material inside {money(r.pending_value)}</Text> : null}
                </Card>
              );
            }
            if (tab === 'open-customer-dcs') {
              return (
                <Card key={r.inward_id}>
                  <Text style={{ fontWeight: '700' }}>{r.customer_name}</Text>
                  <Text>{r.customer_dc_no ? `Customer DC ${r.customer_dc_no}${r.customer_dc_date ? ` (${fmtDate(r.customer_dc_date)})` : ''}` : 'Customer DC not attached'}</Text>
                  <Text style={styles.hint}>{r.inward_no} {'·'} {r.open_items} open item(s), {q3(r.open_qty)} in total {'·'} open {r.days_open} day(s)</Text>
                  {r.customer_dc_pending ? <Text style={{ color: COLORS.warn, fontWeight: '600', fontSize: 12 }}>Dispatch blocked until the customer DC is attached</Text> : null}
                  {r.pending_value !== undefined ? <Text style={styles.hint}>Value {money(r.pending_value)}</Text> : null}
                </Card>
              );
            }
            if (tab === 'work-orders') {
              return (
                <TouchableOpacity key={r.id} onPress={() => navigation.navigate('EjwWorkOrderDetail', { user, woId: r.id })}>
                  <Card>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontWeight: '700' }}>{r.wo_no}</Text>
                      <Pill meta={WO_STATUS[r.status]} />
                    </View>
                    <Text>{r.customer_name}{r.pm_name ? ` · ${r.pm_name}` : ''}</Text>
                    <Text style={styles.hint}>Qty {q3(r.qty)} {'·'} issued {q3(r.issued_qty)} {'·'} ready {q3(r.ready_qty)} {'·'} returned {q3(r.returned_qty)} {'·'} written off {q3(r.short_closed_qty)}</Text>
                    <Text style={styles.hint}>PO {r.customer_po_no || 'not recorded'}</Text>
                    {r.pending_value !== undefined ? <Text style={styles.hint}>Material value still inside {money(r.pending_value)}</Text> : null}
                  </Card>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity key={r.dispatch_id} onPress={() => navigation.navigate('EjwDispatchDetail', { user, dispatchId: r.dispatch_id })}>
                <Card>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: '700' }}>{r.invoice_no}</Text>
                    <Text style={{ color: r.status === 'cancelled' ? COLORS.danger : COLORS.success, fontWeight: '700' }}>{r.status === 'cancelled' ? 'CANCELLED' : fmtDate(r.invoice_date)}</Text>
                  </View>
                  <Text>{r.customer_name}{r.customer_gstin ? ` · ${r.customer_gstin}` : ''}</Text>
                  <Text style={styles.hint}>{r.wo_no} {'·'} challan {r.dc_no} {'·'} SAC {r.sac_code}</Text>
                  <Text style={styles.hint}>
                    Taxable {money(r.taxable_value)}
                    {Number(r.igst_amount) > 0 ? ` · IGST ${money(r.igst_amount)}` : ` · CGST ${money(r.cgst_amount)} · SGST ${money(r.sgst_amount)}`}
                    {` · GST ${Number(r.gst_rate)}%`}
                  </Text>
                  <Text style={{ fontWeight: '700', marginTop: 2 }}>Total {money(r.invoice_total)}</Text>
                  {r.cancel_reason ? <Text style={{ color: COLORS.danger, fontSize: 12 }}>Reason: {r.cancel_reason}</Text> : null}
                </Card>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      <Footer />
    </View>
  );
}
