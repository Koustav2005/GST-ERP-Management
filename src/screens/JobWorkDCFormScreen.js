import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { jobworkDcsAPI, masterVendorsAPI } from '../config/api';
import { apiErrorMessage, appendFile, cleanDecimal, isDate, notify, qty, today } from '../utils/jobwork';
import { ActionModal, Button, Card, COLORS, ErrorBanner, Field, ScreenHeader, styles } from '../components/jobwork/common';
import DateField from '../components/jobwork/DateField';
import { StockItemPicker, VendorPicker } from '../components/jobwork/Pickers';
import { RequestStockItemModal } from '../components/jobwork/Modals';
import { hsnWarning } from '../utils/hsn';
import Footer from '../components/Footer';

// Create a delivery challan from the items picked on the pending list, or edit one that is
// still dc_created / rejected.
export default function JobWorkDCFormScreen({ route, navigation }) {
  const { user, selectedItems, dcId } = route.params;
  const editing = !!dcId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [vendors, setVendors] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [dcStatus, setDcStatus] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [dcNumber, setDcNumber] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [dcDate, setDcDate] = useState(today());
  const [processName, setProcessName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [loadedWeight, setLoadedWeight] = useState('');
  const [unloadedWeight, setUnloadedWeight] = useState('');
  const [rows, setRows] = useState([]);
  const [attachment, setAttachment] = useState(null);
  const [existingAttachment, setExistingAttachment] = useState('');
  const [requestRow, setRequestRow] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]); // my stock item requests still waiting for the accountant
  const [addOpen, setAddOpen] = useState(false);
  const [addProjects, setAddProjects] = useState([]);
  const [addSel, setAddSel] = useState({});
  const [addError, setAddError] = useState('');

  const loadStock = async () => {
    const res = await jobworkDcsAPI.getStockItems();
    setStockItems(res.data.stock_items || []);
  };

  const loadRequests = async () => {
    try {
      const r = await jobworkDcsAPI.listStockItemRequests({ status: 'pending' });
      setPendingRequests(r.data.requests || []);
    } catch (e) {
      setPendingRequests([]);
    }
  };

  // Re-read stock items and my requests, and fill in the stock item on rows the accountant has
  // resolved since this form was opened (the server fills job_work_items.stock_item_id).
  const refreshAll = async () => {
    try {
      await Promise.all([loadStock(), loadRequests()]);
      const p = await jobworkDcsAPI.getPendingItems();
      const resolved = {};
      (p.data.projects || []).forEach((g) => g.items.forEach((i) => {
        if (i.stock_item_id) resolved[i.job_work_item_id] = String(i.stock_item_id);
      }));
      setRows((rs) => rs.map((r) => (r.stock_item_id || !resolved[r.job_work_item_id] ? r : { ...r, stock_item_id: resolved[r.job_work_item_id] })));
    } catch (e) {
      notify('Error', apiErrorMessage(e, 'Could not reload.'));
    }
  };

  const openAdd = async () => {
    setAddError('');
    setAddSel({});
    try {
      const p = await jobworkDcsAPI.getPendingItems();
      const have = new Set(rows.map((r) => r.job_work_item_id));
      setAddProjects((p.data.projects || [])
        .map((g) => ({ ...g, items: g.items.filter((i) => !have.has(i.job_work_item_id)) }))
        .filter((g) => g.items.length));
      setAddOpen(true);
    } catch (e) {
      notify('Error', apiErrorMessage(e, 'Could not load pending items.'));
    }
  };

  const addSelected = () => {
    const chosen = addProjects.flatMap((g) => g.items).filter((i) => addSel[i.job_work_item_id]);
    if (chosen.length === 0) return setAddError('Tick at least one item.');
    setRows((rs) => [...rs, ...chosen.map((i) => ({
      job_work_item_id: i.job_work_item_id, material_name: i.material_name, project_name: i.project_name,
      job_id: i.job_id, quantity: i.quantity, unit: i.unit, hsn: i.hsn, item_kind: i.item_kind, item_code: i.item_code,
      stock_item_id: i.stock_item_id ? String(i.stock_item_id) : (i.suggested_stock_item_id ? String(i.suggested_stock_item_id) : ''),
      suggested: !i.stock_item_id && !!i.suggested_stock_item_id, suggested_name: i.suggested_stock_item_name,
      unit_value: i.unit_value ? String(Number(i.unit_value)) : '',
    }))]);
    setAddOpen(false);
  };

  useEffect(() => {
    (async () => {
      try {
        const [v] = await Promise.all([masterVendorsAPI.getAll(), loadStock(), loadRequests()]);
        setVendors(v.data || []);

        if (editing) {
          const { data } = await jobworkDcsAPI.get(dcId);
          const dc = data.dc;
          setDcStatus(dc.status);
          setRejectionReason(dc.rejection_reason || '');
          setDcNumber(dc.dc_number);
          setVendorId(String(dc.vendor_id));
          setDcDate(String(dc.dc_date).slice(0, 10));
          setProcessName(dc.process || '');
          setVehicleNo(dc.vehicle_number || '');
          setLoadedWeight(dc.loaded_vehicle_weight ? String(Number(dc.loaded_vehicle_weight)) : '');
          setUnloadedWeight(dc.unloaded_vehicle_weight ? String(Number(dc.unloaded_vehicle_weight)) : '');
          setExistingAttachment(dc.attachment_name || '');
          setRows(dc.items.map((i) => ({
            job_work_item_id: i.job_work_item_id, material_name: i.description, project_name: i.project_name,
            job_id: i.job_id, quantity: i.quantity, unit: i.unit, hsn: i.pm_hsn, item_kind: i.item_kind, item_code: i.pm_item_code,
            stock_item_id: String(i.stock_item_id), unit_value: String(Number(i.unit_value)),
          })));
        } else {
          setRows((selectedItems || []).map((i) => ({
            job_work_item_id: i.job_work_item_id, material_name: i.material_name, project_name: i.project_name,
            job_id: i.job_id, quantity: i.quantity, unit: i.unit, hsn: i.hsn, item_kind: i.item_kind, item_code: i.item_code,
            stock_item_id: i.stock_item_id ? String(i.stock_item_id) : (i.suggested_stock_item_id ? String(i.suggested_stock_item_id) : ''),
            suggested: !i.stock_item_id && !!i.suggested_stock_item_id, suggested_name: i.suggested_stock_item_name,
            unit_value: i.unit_value ? String(Number(i.unit_value)) : '',
          })));
        }
      } catch (e) {
        setError(apiErrorMessage(e, 'Could not load the form.'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const patchRow = (id, patch) => setRows((rs) => rs.map((r) => (r.job_work_item_id === id ? { ...r, ...patch } : r)));
  const removeRow = (id) => setRows((rs) => rs.filter((r) => r.job_work_item_id !== id));

  const pickAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets.length) {
        const f = result.assets[0];
        setAttachment({ uri: f.uri, name: f.name, type: f.mimeType || 'application/pdf' });
      }
    } catch (e) {
      notify('Error', 'Could not pick that file.');
    }
  };

  const projectCount = new Set(rows.map((r) => r.project_name)).size;

  const validate = () => {
    if (!vendorId) return 'Choose the vendor.';
    if (!isDate(dcDate)) return 'DC date must be written as YYYY-MM-DD.';
    if (rows.length === 0) return 'A delivery challan needs at least one item.';
    const noStock = rows.find((r) => !r.stock_item_id);
    if (noStock) return `Create stock item first for "${noStock.material_name}": use "Request stock item" and wait for the accountant.`;
    const noValue = rows.find((r) => r.unit_value === '' || Number.isNaN(Number(r.unit_value)));
    if (noValue) return `Enter the unit value for "${noValue.material_name}".`;
    return '';
  };

  const save = async () => {
    const problem = validate();
    if (problem) return setError(problem);
    setError('');
    setSaving(true);
    try {
      const body = {
        vendor_id: Number(vendorId),
        dc_date: dcDate,
        process: processName.trim() || undefined,
        vehicle_number: vehicleNo.trim() || undefined,
        loaded_vehicle_weight: loadedWeight || undefined,
        unloaded_vehicle_weight: unloadedWeight || undefined,
        items: rows.map((r) => ({
          job_work_item_id: r.job_work_item_id, stock_item_id: Number(r.stock_item_id),
          quantity: r.quantity, unit_value: r.unit_value,
        })),
      };
      const res = editing ? await jobworkDcsAPI.update(dcId, body) : await jobworkDcsAPI.create(body);
      const id = res.data.dc.id;

      if (attachment) {
        try {
          const form = new FormData();
          await appendFile(form, 'attachment', attachment);
          await jobworkDcsAPI.uploadAttachment(id, form);
        } catch (e) {
          notify('Saved, but the attachment failed', apiErrorMessage(e) + '\nYou can attach it again by editing the DC.');
        }
      }
      navigation.replace('JobWorkDCDetail', { user, dcId: id });
    } catch (e) {
      setError(apiErrorMessage(e, 'Could not save the delivery challan.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={editing ? 'Edit DC' : 'Create DC'} onBack={() => navigation.goBack()} />
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={editing ? `Edit ${dcNumber}` : 'Create delivery challan'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {dcStatus === 'rejected' ? (
          <ErrorBanner message={`Rejected by accounts: ${rejectionReason || 'no reason given'}\nCorrect it and save to send it for approval again.`} />
        ) : null}
        {projectCount > 1 ? (
          <ErrorBanner kind="warning" message={`This challan carries items from ${projectCount} projects, sharing one truck and one vendor.`} />
        ) : null}
        <ErrorBanner message={error} />

        <Card>
          <VendorPicker vendors={vendors} value={vendorId} onChange={setVendorId} />
          <DateField label="DC date *" value={dcDate} onChange={setDcDate} />
          <Field label="Process" value={processName} onChangeText={setProcessName} placeholder="e.g. Shot blasting (defaults to the job work type)" />
          <Field label="Vehicle number" value={vehicleNo} onChangeText={(t) => setVehicleNo(t.toUpperCase())} autoCapitalize="characters" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field style={{ flex: 1 }} label="Loaded weight (kg)" value={loadedWeight} keyboardType="decimal-pad"
              onChangeText={(t) => setLoadedWeight(cleanDecimal(t, 2))} />
            <Field style={{ flex: 1 }} label="Unloaded weight (kg)" value={unloadedWeight} keyboardType="decimal-pad"
              onChangeText={(t) => setUnloadedWeight(cleanDecimal(t, 2))} />
          </View>
          <Text style={styles.hint}>The DC number (SE/DC/NNNN) is generated when you save.</Text>
        </Card>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.sectionTitle}>Items ({rows.length})</Text>
          <TouchableOpacity onPress={refreshAll}>
            <Text style={{ color: COLORS.primary, fontWeight: '600', marginTop: 8 }}>↻ Reload stock items</Text>
          </TouchableOpacity>
        </View>
        <Button title="＋ Add pending items" kind="ghost" onPress={openAdd} style={{ marginBottom: 6 }} />
        {rows.map((r) => (
          <Card key={r.job_work_item_id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', fontSize: 15 }}>{r.material_name}</Text>
                <Text style={styles.hint}>{r.project_name || '-'} · {r.job_id}</Text>
                {r.item_kind === 'product' ? <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>Product being developed{r.item_code ? ` · Part no. ${r.item_code}` : ''}</Text> : null}
              </View>
              {rows.length > 1 ? (
                <TouchableOpacity onPress={() => removeRow(r.job_work_item_id)}>
                  <Text style={{ color: COLORS.danger, fontWeight: '600' }}>Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={[styles.label, { marginTop: 8 }]}>Stock item *</Text>
            <StockItemPicker items={stockItems} value={r.stock_item_id} onChange={(v) => patchRow(r.job_work_item_id, { stock_item_id: v, suggested: false })} />
            {r.suggested && r.stock_item_id ? (
              <Text style={styles.hint}>Pre-filled with "{r.suggested_name}" from an earlier challan for the same BOM item. You can change it.</Text>
            ) : null}
            {(() => {
              const chosen = stockItems.find((st) => String(st.id) === String(r.stock_item_id));
              const warning = chosen ? hsnWarning(r.hsn, chosen.hsn) : '';
              return warning ? <ErrorBanner kind="warning" message={warning} /> : null;
            })()}
            {!r.stock_item_id ? (
              <View style={{ marginTop: 6 }}>
                {pendingRequests.find((q) => q.job_work_item_id === r.job_work_item_id) ? (
                  <Text style={{ color: COLORS.warn, fontSize: 12 }}>
                    Requested, waiting for the accountant. Use ↻ Reload stock items once it is created.
                  </Text>
                ) : (
                  <View>
                    <Text style={{ color: COLORS.warn, fontSize: 12, marginBottom: 6 }}>
                      No stock item chosen. If it is not in the list, ask the accountant to create it.
                    </Text>
                    <Button title="Request stock item" kind="ghost" onPress={() => setRequestRow(r)} />
                  </View>
                )}
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <Field style={{ flex: 1 }} label="Quantity (fixed)" value={`${qty(r.quantity)} ${r.unit}`} editable={false} />
              <Field style={{ flex: 1 }} label="Unit value (₹) *" value={r.unit_value} keyboardType="decimal-pad" placeholder="0.00"
                onChangeText={(t) => patchRow(r.job_work_item_id, { unit_value: cleanDecimal(t, 2) })} />
            </View>
          </Card>
        ))}
        <Text style={styles.hint}>
          The component keeps its value while it is out. GST is charged by the vendor on the job charge only, never on this value.
        </Text>

        <Card>
          <Text style={styles.label}>Attachment (optional)</Text>
          <Text style={styles.hint}>{attachment ? attachment.name : existingAttachment || 'None'}</Text>
          <Button title={attachment || existingAttachment ? 'Change file' : 'Choose PDF / image'} kind="ghost" onPress={pickAttachment}
            style={{ marginTop: 8 }} />
        </Card>

        <Button title={editing ? (dcStatus === 'rejected' ? 'Save and resubmit' : 'Save changes') : 'Create delivery challan'}
          onPress={save} loading={saving} style={{ marginTop: 10 }} />
      </ScrollView>

      <RequestStockItemModal
        visible={!!requestRow}
        initialName={requestRow ? requestRow.material_name : ''}
        initialHsn={requestRow ? requestRow.hsn : ''}
        initialUnit={requestRow ? requestRow.unit : ''}
        context={requestRow ? { jobWorkItemId: requestRow.job_work_item_id, dcId: editing ? dcId : undefined, process: processName } : {}}
        onClose={() => setRequestRow(null)}
        onDone={(request) => {
          setRequestRow(null);
          setPendingRequests((prev) => [...prev, request]);
          notify('Request sent', 'The accountant has been notified. When it is created the stock item is filled in on this item: use ↻ Reload stock items to see it.');
        }}
      />

      <ActionModal visible={addOpen} title="Add pending items" subtitle="Same vendor and truck: tick items to add to this challan."
        onClose={() => setAddOpen(false)}
        footer={<>
          <Button title="Cancel" kind="ghost" onPress={() => setAddOpen(false)} />
          <Button title="Add selected" onPress={addSelected} />
        </>}>
        <ErrorBanner message={addError} />
        {addProjects.length === 0 ? <Text style={styles.hint}>No other items are waiting for a challan.</Text> : null}
        {addProjects.map((g) => (
          <View key={String(g.project_id)}>
            <Text style={styles.sectionTitle}>{g.project_name || 'No project'}</Text>
            {g.items.map((i) => (
              <TouchableOpacity key={i.job_work_item_id} onPress={() => setAddSel((sel) => ({ ...sel, [i.job_work_item_id]: !sel[i.job_work_item_id] }))}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                <Text style={{ fontSize: 22, marginRight: 10 }}>{addSel[i.job_work_item_id] ? '☑' : '☐'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '600' }}>{i.material_name}</Text>
                  <Text style={styles.hint}>{qty(i.quantity)} {i.unit} · {i.job_id}{i.stock_item_name ? '' : ' · no stock item yet'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ActionModal>
      <Footer />
    </View>
  );
}
