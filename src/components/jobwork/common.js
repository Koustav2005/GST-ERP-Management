import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, ScrollView } from 'react-native';
import { DC_STATUS } from '../../utils/jobwork';

export const COLORS = {
  primary: '#007AFF',
  success: '#28A745',
  danger: '#FF3B30',
  warn: '#FF9500',
  header: '#FFC107',
  bg: '#F2F2F7',
  muted: '#8E8E93',
  border: '#E5E5EA',
};

export function ScreenHeader({ title, onBack, right }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

export function StatusBadge({ status }) {
  const meta = DC_STATUS[status] || { label: status, color: COLORS.muted };
  return (
    <View style={[styles.badge, { backgroundColor: meta.color }]}>
      <Text style={styles.badgeText}>{meta.label}</Text>
    </View>
  );
}

export function Button({ title, onPress, kind = 'primary', disabled, loading, style }) {
  const bg = { primary: COLORS.primary, success: COLORS.success, danger: COLORS.danger, ghost: 'white' }[kind];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, { backgroundColor: bg, opacity: disabled || loading ? 0.6 : 1 },
        kind === 'ghost' && { borderWidth: 1, borderColor: COLORS.primary }, style]}
    >
      {loading ? <ActivityIndicator color={kind === 'ghost' ? COLORS.primary : 'white'} />
        : <Text style={[styles.buttonText, kind === 'ghost' && { color: COLORS.primary }]}>{title}</Text>}
    </TouchableOpacity>
  );
}

export function Field({ label, hint, style, ...inputProps }) {
  return (
    <View style={[{ marginBottom: 10 }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput style={[styles.input, inputProps.editable === false && styles.inputReadonly]}
        placeholderTextColor="#B0B0B5" {...inputProps} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function ErrorBanner({ message, kind = 'error' }) {
  if (!message) return null;
  const color = kind === 'warning' ? COLORS.warn : COLORS.danger;
  return (
    <View style={[styles.banner, { borderColor: color, backgroundColor: kind === 'warning' ? '#FFF6E5' : '#FFECEB' }]}>
      <Text style={{ color, fontSize: 13 }}>{message}</Text>
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value === undefined || value === null || value === '' ? '-' : value}</Text>
    </View>
  );
}

// Bottom-sheet style modal used by every action on the DC detail screen.
export function ActionModal({ visible, title, subtitle, onClose, children, footer, sticky }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{title}</Text>
          {subtitle ? <Text style={styles.modalSubtitle}>{subtitle}</Text> : null}
          <ScrollView style={{ maxHeight: 440 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
          {sticky}
          <View style={styles.modalFooter}>{footer}</View>
        </View>
      </View>
    </Modal>
  );
}

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.header, padding: 20, paddingTop: 50, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  backButton: { paddingVertical: 5, minWidth: 60 },
  backText: { color: 'white', fontSize: 15, fontWeight: '600' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  headerRight: { minWidth: 60, alignItems: 'flex-end' },
  content: { padding: 12, paddingBottom: 40 },
  card: {
    backgroundColor: 'white', borderRadius: 10, padding: 14, marginVertical: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1E', marginTop: 10, marginBottom: 4, marginLeft: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  rowLabel: { color: COLORS.muted, fontSize: 13, flex: 1 },
  rowValue: { color: '#1C1C1E', fontSize: 13, fontWeight: '600', flex: 2, textAlign: 'right' },
  label: { fontSize: 13, fontWeight: '600', color: '#3A3A3C', marginBottom: 4 },
  hint: { fontSize: 12, color: COLORS.muted, marginTop: 3 },
  input: {
    borderWidth: 1, borderColor: '#D1D1D6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9,
    fontSize: 15, backgroundColor: 'white', color: '#1C1C1E',
  },
  inputReadonly: { backgroundColor: '#F2F2F7', color: '#6E6E73' },
  pickerBox: { borderWidth: 1, borderColor: '#D1D1D6', borderRadius: 8, backgroundColor: 'white', overflow: 'hidden' },
  button: { borderRadius: 8, paddingVertical: 11, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', minHeight: 42 },
  buttonText: { color: 'white', fontWeight: '700', fontSize: 15 },
  badge: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { color: 'white', fontSize: 11, fontWeight: '700' },
  banner: { borderWidth: 1, borderRadius: 8, padding: 10, marginVertical: 6 },
  empty: { alignItems: 'center', paddingTop: 50 },
  emptyText: { color: COLORS.muted, fontSize: 15, textAlign: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { color: COLORS.muted, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: COLORS.primary },
  chipRow: { paddingHorizontal: 8, paddingVertical: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: 'white', marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: '#3A3A3C', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: 'white' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modal: { backgroundColor: 'white', borderRadius: 12, padding: 16, maxHeight: '92%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  modalSubtitle: { fontSize: 13, color: COLORS.muted, marginTop: 2, marginBottom: 10 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
});
