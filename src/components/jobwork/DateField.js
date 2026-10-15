import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, styles } from './common';

const pad = (n) => String(n).padStart(2, '0');
const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromStr = (s) => (s ? new Date(`${s}T00:00:00`) : new Date());

// Date picker that reads and writes 'YYYY-MM-DD' strings, so it drops into the existing forms.
// optional: shows a clear (x) button and allows the empty string.
export default function DateField({ label, value, onChange, optional = false, hint, style }) {
  const [show, setShow] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={[{ marginBottom: 10 }, style]}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        {React.createElement('input', {
          type: 'date', value: value || '', onChange: (e) => onChange(e.target.value),
          style: { padding: 9, fontSize: 15, borderRadius: 8, border: '1px solid #D1D1D6' },
        })}
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    );
  }

  const handleChange = (event, picked) => {
    if (Platform.OS !== 'ios') setShow(false);
    if (event.type === 'dismissed') return;
    if (picked) onChange(toStr(picked));
  };

  return (
    <View style={[{ marginBottom: 10 }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity style={[styles.input, { flex: 1 }]} onPress={() => setShow(true)}>
          <Text style={{ fontSize: 15, color: value ? '#1C1C1E' : '#B0B0B5' }}>
            {value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not set'}
          </Text>
        </TouchableOpacity>
        {optional && value ? (
          <TouchableOpacity onPress={() => onChange('')} style={{ paddingHorizontal: 12 }}>
            <Text style={{ fontSize: 18, color: COLORS.muted }}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {show ? (
        <View>
          <DateTimePicker value={fromStr(value)} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} onChange={handleChange} />
          {Platform.OS === 'ios' ? (
            <TouchableOpacity onPress={() => setShow(false)} style={{ alignSelf: 'flex-end', padding: 8 }}>
              <Text style={{ color: COLORS.primary, fontWeight: '700' }}>Done</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}
