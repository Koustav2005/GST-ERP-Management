import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { jobworkDcsAPI } from '../../config/api';
import { fmtDate, qty } from '../../utils/jobwork';
import { COLORS, StatusBadge, styles } from './common';

// Read-only "Job work" panel for ProjectDetailsScreen: for each item sent out, which challan, which
// vendor has it now, since when, how many days, and sent / returned / pending. No money fields.
// Shown to the project's PM and to management; hides itself if the server says no (403).
export default function ProjectJobWorkPanel({ projectId }) {
  const [state, setState] = useState({ loading: true, requests: [], hidden: false, error: '' });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await jobworkDcsAPI.getProjectJobWork(projectId);
      setState({ loading: false, requests: res.data.requests || [], hidden: false, error: '' });
    } catch (e) {
      const status = e.response && e.response.status;
      setState({ loading: false, requests: [], hidden: status === 403 || status === 404, error: status === 403 || status === 404 ? '' : 'Could not load job work.' });
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  if (state.hidden) return null;
  return (
    <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, marginHorizontal: 0, marginVertical: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 17, fontWeight: '700' }}>Job work</Text>
        {state.loading ? <ActivityIndicator size="small" color={COLORS.primary} /> : (
          <TouchableOpacity onPress={load}><Text style={{ color: COLORS.primary, fontWeight: '600' }}>↻ Refresh</Text></TouchableOpacity>
        )}
      </View>
      {state.error ? <Text style={{ color: COLORS.danger, marginTop: 6 }}>{state.error}</Text> : null}
      {!state.loading && !state.error && state.requests.length === 0 ? (
        <Text style={[styles.hint, { marginTop: 6 }]}>No material has been sent for job work from this project yet.</Text>
      ) : null}

      {state.requests.map((req) => (
        <View key={req.request_id} style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: '700' }}>{req.job_id} · {req.job_work_type}</Text>
          {req.items.map((i) => (
            <View key={i.job_work_item_id} style={{ borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: 8, marginTop: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontWeight: '600', flex: 1 }}>{i.material_name}</Text>
                {i.dc_status ? <StatusBadge status={i.dc_status} /> : <Text style={styles.hint}>No challan yet</Text>}
              </View>
              {i.dc_number ? <Text style={styles.hint}>DC {i.dc_number}{i.vendor_name ? ` · ${i.vendor_name}` : ''}</Text> : null}
              <Text style={{ fontSize: 13, marginTop: 2 }}>{i.where}{i.since ? ` since ${fmtDate(i.since)}` : ''}</Text>
              {i.days_out !== null && i.days_out !== undefined ? (
                <Text style={{ fontSize: 13, color: i.days_out > 30 ? COLORS.danger : '#1C1C1E', fontWeight: i.days_out > 30 ? '700' : '400' }}>
                  Out {i.days_out} day{i.days_out === 1 ? '' : 's'}
                </Text>
              ) : null}
              <Text style={{ fontSize: 13, marginTop: 2 }}>
                Sent {qty(i.quantity)} · Returned {qty(i.returned_quantity)} · Pending {qty(i.pending_quantity)} {i.unit}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
