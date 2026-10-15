import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { ejwAPI } from '../config/api';
import { apiErrorMessage, cleanDecimal, fmtDate, notify } from '../utils/jobwork';
import { q3 } from '../utils/ejw';
import { Button, Card, COLORS, ErrorBanner, Field, ScreenHeader, styles } from '../components/jobwork/common';
import { Empty, Loading, Tabs, useScreenLoad } from '../components/ejw/parts';
import Footer from '../components/Footer';

// Store: the PM says some material is ready; Store counts it and confirms. Only this confirmation makes it dispatchable.
export default function EjwConfirmReadyScreen({ route, navigation }) {
  const { user } = route.params;
  const [tab, setTab] = useState('pending');
  const [notices, setNotices] = useState([]);
  const [counted, setCounted] = useState({}); // `${noticeId}:${itemId}` -> text
  const [busyId, setBusyId] = useState(null);
  const [errors, setErrors] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const { loading, error, reload } = useScreenLoad(async () => {
    const r = await ejwAPI.listReadyNotices({ status: tab });
    setNotices(r.data.notices || []);
  }, [tab]);

  const confirm = async (n) => {
    setErrors((e) => ({ ...e, [n.id]: '' }));
    setBusyId(n.id);
    try {
      const items = n.items.map((i) => ({ inward_item_id: i.inward_item_id, confirmed_qty: counted[`${n.id}:${i.inward_item_id}`] !== undefined ? counted[`${n.id}:${i.inward_item_id}`] : String(Number(i.claimed_qty)) }));
      await ejwAPI.confirmReady(n.id, { items });
      notify('Confirmed', `${n.wo_no}: ready quantity recorded. Accounts has been told.`);
      await reload();
    } catch (e) { setErrors((er) => ({ ...er, [n.id]: apiErrorMessage(e, 'Could not confirm.') })); } finally { setBusyId(null); }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Confirm Ready" onBack={() => navigation.goBack()} />
      <Tabs tabs={[{ key: 'pending', label: 'Waiting for count' }, { key: 'confirmed', label: 'Confirmed' }]} active={tab} onChange={setTab} />
      <ErrorBanner message={error} />
      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} />}>
          {notices.length === 0 ? <Empty text={tab === 'pending' ? 'Nothing is waiting for you to count.' : 'No confirmed notices yet.'} /> : notices.map((n) => (
            <Card key={n.id}>
              <Text style={{ fontWeight: '700', fontSize: 15 }}>{n.wo_no} {'·'} {n.customer_name}</Text>
              <Text style={styles.hint}>Marked ready by {n.marked_by_name || '-'} on {fmtDate(n.created_at)}{n.inspection_report_name ? ` · report: ${n.inspection_report_name}` : ''}</Text>
              {n.note ? <Text style={styles.hint}>Note: {n.note}</Text> : null}
              {n.items.map((i) => (
                <View key={i.id} style={{ borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 8, paddingTop: 8 }}>
                  <Text style={{ fontWeight: '600' }}>{i.description}</Text>
                  <Text style={styles.hint}>HSN {i.hsn || '-'} {'·'} {i.inward_no} {'·'} PM says {q3(i.claimed_qty)} {i.unit} ready</Text>
                  {n.status === 'pending' ? (
                    <Field label={`You counted (${i.unit})`} value={counted[`${n.id}:${i.inward_item_id}`] !== undefined ? counted[`${n.id}:${i.inward_item_id}`] : String(Number(i.claimed_qty))}
                      keyboardType="decimal-pad" onChangeText={(t) => setCounted({ ...counted, [`${n.id}:${i.inward_item_id}`]: cleanDecimal(t, 3) })}
                      hint="Change it if the physical count is different. It cannot be more than the PM claimed." />
                  ) : <Text style={{ fontWeight: '700', marginTop: 4 }}>Confirmed: {q3(i.confirmed_qty)} {i.unit}</Text>}
                </View>
              ))}
              {n.status === 'pending' ? (
                <>
                  <ErrorBanner message={errors[n.id]} />
                  <Button style={{ marginTop: 10 }} title="Confirm count" kind="success" loading={busyId === n.id} onPress={() => confirm(n)} />
                </>
              ) : null}
            </Card>
          ))}
        </ScrollView>
      )}
      <Footer />
    </View>
  );
}
