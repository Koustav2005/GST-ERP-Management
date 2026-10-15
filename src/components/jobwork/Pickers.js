import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { jobworkDcsAPI } from '../../config/api';
import { styles, COLORS } from './common';

// GST rate is ALWAYS a dropdown fed by the gst_rates master, never typed.
export function useGstRates() {
  const [rates, setRates] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    jobworkDcsAPI.getGstRates()
      .then((r) => setRates(r.data.gst_rates || []))
      .catch(() => setError('Could not load GST rates'));
  }, []);
  return { rates, error };
}

export function GstRatePicker({ rates, value, onChange, label = 'GST rate *', error }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickerBox}>
        <Picker selectedValue={value} onValueChange={(v) => onChange(v)}>
          <Picker.Item label="-- Select GST rate --" value="" />
          {rates.map((r) => <Picker.Item key={r.id} label={r.label} value={String(r.id)} />)}
        </Picker>
      </View>
      {error ? <Text style={{ color: COLORS.danger, fontSize: 12, marginTop: 3 }}>{error}: close and reopen this form to retry, or check the backend is up to date.</Text> : null}
    </View>
  );
}

export function VendorPicker({ vendors, value, onChange, label = 'Vendor *', exclude = [], enabled = true }) {
  const options = vendors.filter((v) => !exclude.includes(v.id));
  const selected = vendors.find((v) => String(v.id) === String(value));
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickerBox}>
        <Picker selectedValue={value} onValueChange={(v) => onChange(v)} enabled={enabled}>
          <Picker.Item label="-- Select vendor --" value="" />
          {options.map((v) => <Picker.Item key={v.id} label={v.name} value={String(v.id)} />)}
        </Picker>
      </View>
      {selected ? (
        <Text style={styles.hint}>
          GSTIN: {selected.gst_number || 'not set'} · State: {selected.state || 'not set'}
          {!selected.gst_number && !selected.state ? '  (set one in Master Vendor List: needed for GST and e-way rules)' : ''}
        </Text>
      ) : null}
    </View>
  );
}

export function StockItemPicker({ items, value, onChange }) {
  return (
    <View style={styles.pickerBox}>
      <Picker selectedValue={value} onValueChange={(v) => onChange(v)}>
        <Picker.Item label="-- Select stock item --" value="" />
        {items.map((s) => <Picker.Item key={s.id} label={`${s.name}${s.hsn ? ` (HSN ${s.hsn})` : ''}`} value={String(s.id)} />)}
      </Picker>
    </View>
  );
}

export const pickerWarning = { color: COLORS.warn, fontSize: 12, marginTop: 3 };
