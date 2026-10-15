import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { apiErrorMessage } from '../../utils/jobwork';
import { COLORS, styles } from '../jobwork/common';

// Load something when the screen opens, every time it comes back into focus (after saving elsewhere), and whenever
// one of `deps` changes (a filter, a tab). load: async () => void that sets state. Always the latest closure is used.
export function useScreenLoad(load, deps = []) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadRef = useRef(load);
  loadRef.current = load;
  const run = useCallback(async () => {
    setError('');
    try {
      await loadRef.current();
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not load. Pull down or try again.'));
    } finally {
      setLoading(false);
    }
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => { run(); }, [run, ...deps]));
  return { loading, error, reload: run, setError };
}

export function Loading() {
  return <View style={{ padding: 40 }}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
}

export function Empty({ text }) {
  return <View style={styles.empty}><Text style={styles.emptyText}>{text}</Text></View>;
}

// Dropdown from [{ value, label }].
export function SimplePicker({ label, value, onChange, options, placeholder = '-- Select --', enabled = true, hint }) {
  return (
    <View style={{ marginBottom: 10 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.pickerBox}>
        <Picker selectedValue={value} onValueChange={(v) => onChange(v)} enabled={enabled}>
          <Picker.Item label={placeholder} value="" />
          {options.map((o) => <Picker.Item key={String(o.value)} label={o.label} value={String(o.value)} />)}
        </Picker>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

// Tabs / filter chips. tabs: [{ key, label }]
export function Tabs({ tabs, active, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={{ flexGrow: 1 }}>
      {tabs.map((t) => (
        <TouchableOpacity key={t.key} style={[styles.tab, { paddingHorizontal: 14 }, active === t.key && styles.tabActive]} onPress={() => onChange(t.key)}>
          <Text style={[styles.tabText, active === t.key && styles.tabTextActive]}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export function Pill({ meta, text }) {
  const m = meta || { label: text, color: COLORS.muted };
  return (
    <View style={[styles.badge, { backgroundColor: m.color }]}>
      <Text style={styles.badgeText}>{text || m.label}</Text>
    </View>
  );
}

// A bullet list of reasons something is blocked.
export function Blockers({ items, title = 'Cannot dispatch yet' }) {
  if (!items || !items.length) return null;
  return (
    <View style={{ borderWidth: 1, borderColor: COLORS.danger, backgroundColor: '#FFECEB', borderRadius: 8, padding: 10, marginVertical: 6 }}>
      <Text style={{ color: COLORS.danger, fontWeight: '700', marginBottom: 4 }}>{title}</Text>
      {items.map((b, i) => <Text key={i} style={{ color: COLORS.danger, fontSize: 13, marginTop: 2 }}>{'• '}{b}</Text>)}
    </View>
  );
}

// A picked file shown with a remove link.
export function FileChip({ file, onRemove }) {
  if (!file) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
      <Text style={{ flex: 1, fontSize: 13, color: '#1C1C1E' }} numberOfLines={1}>{file.name}</Text>
      <TouchableOpacity onPress={onRemove}><Text style={{ color: COLORS.danger, fontWeight: '600' }}>Remove</Text></TouchableOpacity>
    </View>
  );
}

// Small label/value block for tables made of stacked rows.
export function KV({ label, value, bold }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 2 }}>
      <Text style={{ width: 130, color: COLORS.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 13, color: '#1C1C1E', fontWeight: bold ? '700' : '400' }}>{value === undefined || value === null || value === '' ? '-' : String(value)}</Text>
    </View>
  );
}

export const roleOf = (user) => String((user && user.role) || '').toLowerCase();

// useEffect that ignores the first render's cleanup noise: debounce a callback.
export function useDebounced(fn, deps, ms = 350) {
  useEffect(() => {
    const t = setTimeout(fn, ms);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
