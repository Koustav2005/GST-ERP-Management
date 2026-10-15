import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { ejwAPI, projectsAPI } from '../config/api';
import { apiErrorMessage, appendFile, cleanDecimal, fmtDate, money, notify } from '../utils/jobwork';
import { DOC_KINDS, WO_STATUS, pickFile, q3 } from '../utils/ejw';
import { ActionModal, Button, Card, COLORS, ErrorBanner, Field, ScreenHeader, styles } from '../components/jobwork/common';
import { FileChip, KV, Loading, Pill, SimplePicker, roleOf, useScreenLoad } from '../components/ejw/parts';
import Footer from '../components/Footer';

// One work order: items with their progress, PO number, documents, expected material (S3), request material,
// mark ready (PM), short-close and dispatch (Accounts). The PM never sees a rupee amount here (the server removes them).
export default function EjwWorkOrderDetailScreen({ route, navigation }) {
  const { user, woId } = route.params;
  const role = roleOf(user);
  const isPm = role === 'project_manager';
  const canEdit = isPm || role === 'npd';
  const isAccounts = role === 'accountant';
  const [wo, setWo] = useState(null);
  const [notices, setNotices] = useState([]);
  const [po, setPo] = useState('');
  const [workers, setWorkers] = useState([]); // workers on this job's project
  const [companyWorkers, setCompanyWorkers] = useState([]);
  const [newWorker, setNewWorker] = useState('');
  const [poOther, setPoOther] = useState(false); // typing the customer's own PO number instead of the project's
  const [note, setNote] = useState('');
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [doc, setDoc] = useState({ kind: 'drawing', file: null });
  const [ready, setReady] = useState({ qtys: {}, file: null, note: '' });
  const [sc, setSc] = useState({ item: null, qty: '', reason: '' });

  const { loading, error, reload, setError } = useScreenLoad(async () => {
    const r = await ejwAPI.getWorkOrder(woId);
    setWo(r.data.work_order);
    setPo(r.data.work_order.customer_po_no || '');
    setPoOther(!!r.data.work_order.customer_po_no && r.data.work_order.customer_po_no !== r.data.work_order.project_po_no);
    setNote(r.data.work_order.expected_material_note || '');
    if (r.data.work_order.project_id && ['project_manager', 'npd', 'management', 'store_incharge', 'accountant'].includes(role)) {
      try { setWorkers((await projectsAPI.getProjectWorkers(r.data.work_order.project_id)).data.workers || []); } catch (e) { setWorkers([]); }
    }
    if (isPm) {
      try { setCompanyWorkers((await projectsAPI.getWorkers(user.company_id)).data.workers || []); } catch (e) { setCompanyWorkers([]); }
    }
    if (['project_manager', 'store_incharge', 'accountant', 'management'].includes(role)) {
      try { const n = await ejwAPI.listReadyNotices(); setNotices((n.data.notices || []).filter((x) => x.wo_id === woId)); } catch (e) { setNotices([]); }
    }
  });

  const close = () => { setModal(null); setFormError(''); };
  const run = async (fn, okMessage) => {
    setFormError(''); setBusy(true);
    try { await fn(); close(); await reload(); if (okMessage) notify('Done', okMessage); } catch (e) { setFormError(apiErrorMessage(e)); } finally { setBusy(false); }
  };
  const addWorker = async () => {
    if (!newWorker) return;
    setError('');
    try { await projectsAPI.addProjectWorker(wo.project_id, Number(newWorker)); setNewWorker(''); await reload(); } catch (e) { setError(apiErrorMessage(e, 'Could not add the worker.')); }
  };
  const removeWorker = async (workerId) => {
    setError('');
    try { await projectsAPI.removeProjectWorker(wo.project_id, workerId); await reload(); } catch (e) { setError(apiErrorMessage(e, 'Could not remove the worker.')); }
  };
  const savePo = async (value) => {
    setError('');
    try { await ejwAPI.updateWorkOrder(woId, { customer_po_no: value === undefined ? po : value }); await reload(); notify('Saved', 'PO number saved.'); } catch (e) { setError(apiErrorMessage(e)); }
  };
  // dropdown: the PO number generated for this project when the customer's PO was uploaded, or the customer's own number
  const pickPo = (v) => {
    if (v === 'other') { setPoOther(true); return; }
    setPoOther(false);
    if (v && v !== wo.customer_po_no) savePo(v);
  };
  const saveNote = async () => {
    setError('');
    try { await ejwAPI.setExpectedMaterial(woId, note); await reload(); notify('Saved', 'Expected-material note saved.'); } catch (e) { setError(apiErrorMessage(e)); }
  };
  const upload = () => run(async () => {
    if (!doc.file) throw new Error('Choose a file first.');
    const fd = new FormData();
    fd.append('kind', doc.kind);
    await appendFile(fd, 'file', doc.file);
    await ejwAPI.uploadWorkOrderDocument(woId, fd);
    setDoc({ kind: 'drawing', file: null });
  }, 'Document uploaded.');
  const markReady = () => run(async () => {
    const items = wo.items.filter((i) => Number(ready.qtys[i.id]) > 0).map((i) => ({ inward_item_id: i.id, qty: ready.qtys[i.id] }));
    if (!items.length) throw new Error('Enter the quantity that is ready for at least one item.');
    const fd = new FormData();
    fd.append('items', JSON.stringify(items));
    if (ready.note) fd.append('note', ready.note);
    if (ready.file) await appendFile(fd, 'inspection_report', ready.file);
    await ejwAPI.markReady(woId, fd);
    setReady({ qtys: {}, file: null, note: '' });
  }, 'Sent to Store. Store will count the material and confirm.');
  const shortClose = () => run(() => ejwAPI.shortClose(sc.item.id, { qty: sc.qty, reason: sc.reason }), 'Short-closed.');

  if (loading || !wo) return <View style={styles.container}><ScreenHeader title="Work order" onBack={() => navigation.goBack()} /><ErrorBanner message={error} />{loading ? <Loading /> : null}</View>;
  const closed = wo.status === 'closed';
  const hasReport = wo.documents.some((d) => d.kind === 'inspection_report');
  const pendingNotice = notices.find((n) => n.status === 'pending');
  const openItems = wo.items.filter((i) => Number(i.issued_qty) - Number(i.ready_qty) > 0);

  return (
    <View style={styles.container}>
      <ScreenHeader title={wo.wo_no} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={error} />
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontWeight: '700', fontSize: 16 }}>{wo.customer_name}</Text>
            <Pill meta={WO_STATUS[wo.status]} />
          </View>
          <KV label="Project manager" value={wo.pm_name || 'Not assigned yet'} />
          <KV label="Job" value={wo.description} />
          {wo.enquiry_number ? <KV label="Enquiry" value={wo.enquiry_number} /> : null}
          {canEdit && !closed ? (
            <View style={{ marginTop: 8 }}>
              {wo.project_po_no ? (
                <SimplePicker label="PO no." value={poOther ? 'other' : (wo.customer_po_no || '')} onChange={pickPo} placeholder="-- Select PO --"
                  options={[{ value: wo.project_po_no, label: `${wo.project_po_no} (this project's PO)` }, { value: 'other', label: "Other: type the customer's own PO number" }]}
                  hint="Printed on the delivery challan and the tax invoice." />
              ) : null}
              {!wo.project_po_no || poOther ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                  <Field style={{ flex: 1, marginBottom: 0 }} label={wo.project_po_no ? "Customer's own PO no." : 'Customer PO no.'} value={po} onChangeText={setPo} />
                  <Button title="Save" onPress={() => savePo()} />
                </View>
              ) : null}
            </View>
          ) : <KV label="PO no." value={wo.customer_po_no || 'Not recorded'} bold />}
        </Card>

        {wo.status === 'awaiting_material' ? (
          <Card>
            <Text style={styles.label}>Waiting for the customer's material</Text>
            {canEdit ? (
              <>
                <Field label="Expected material (what, when)" value={note} onChangeText={setNote} multiline />
                <Button title="Save note" kind="ghost" onPress={saveNote} />
              </>
            ) : <Text style={styles.hint}>{wo.expected_material_note || 'No note.'}</Text>}
          </Card>
        ) : null}

        <Text style={styles.sectionTitle}>Workers on this job</Text>
        <Card>
          {workers.length === 0 ? <Text style={styles.hint}>No worker is assigned yet. {isPm ? 'Add one below, then you can request material for the floor.' : ''}</Text> : workers.map((w) => (
            <View key={w.worker_id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
              <Text style={{ fontSize: 14 }}>{w.name}</Text>
              {isPm && !closed ? <Text style={{ color: COLORS.danger, fontWeight: '600' }} onPress={() => removeWorker(w.worker_id)}>Remove</Text> : null}
            </View>
          ))}
          {isPm && !closed ? (
            <View style={{ marginTop: 8 }}>
              <SimplePicker label="Add a worker" value={newWorker} onChange={setNewWorker} placeholder="-- Select worker --"
                options={companyWorkers.filter((c) => !workers.some((w) => w.worker_id === c.id)).map((c) => ({ value: c.id, label: c.name }))} />
              <Button title="Add worker" kind="ghost" onPress={addWorker} disabled={!newWorker} />
            </View>
          ) : null}
        </Card>

        <Text style={styles.sectionTitle}>Items</Text>
        {wo.items.length === 0 ? <Card><Text style={styles.hint}>No material received against this job yet.</Text></Card> : wo.items.map((it) => (
          <Card key={it.id}>
            <Text style={{ fontWeight: '700' }}>{it.description}</Text>
            <Text style={styles.hint}>HSN {it.hsn || '-'} {'·'} {it.inward_no} {'·'} {it.customer_dc_no ? `Customer DC ${it.customer_dc_no}` : 'customer DC pending'}</Text>
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              {[['Received', it.qty], ['Issued', it.issued_qty], ['Ready', it.ready_qty], ['Returned', it.returned_qty], ['Written off', it.short_closed_qty]].map(([l, v]) => (
                <View key={l} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700' }}>{q3(v)}</Text>
                  <Text style={{ fontSize: 10, color: COLORS.muted }}>{l}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.hint, { marginTop: 4 }]}>Unit: {it.unit}{it.unit_value !== undefined ? ` · ${money(it.unit_value)} per unit` : ''}</Text>
            {isAccounts && Number(it.pending_qty) > 0 ? (
              <Button style={{ marginTop: 8 }} title="Short-close..." kind="ghost" onPress={() => { setSc({ item: it, qty: String(Number(it.pending_qty)), reason: '' }); setModal('sc'); }} />
            ) : null}
          </Card>
        ))}

        {pendingNotice ? (
          <ErrorBanner kind="warning" message={`Ready notice #${pendingNotice.id} is waiting for Store to count and confirm.`} />
        ) : null}
        {notices.filter((n) => n.status === 'confirmed').slice(0, 3).map((n) => (
          <Text key={n.id} style={styles.hint}>Confirmed by Store on {fmtDate(n.confirmed_at)}: {n.items.map((i) => `${q3(i.confirmed_qty)} ${i.unit} ${i.description}`).join(', ')}</Text>
        ))}

        {isPm && !closed ? (
          <View style={{ gap: 10, marginTop: 8 }}>
            <Button title="Request material for the floor" kind="ghost" disabled={workers.length === 0} onPress={() => navigation.navigate('ExternalJobworkMaterialRequest', { project: { id: wo.project_id, name: wo.wo_no }, user })} />
            <Button title="Mark ready" kind="success" disabled={!!pendingNotice || openItems.length === 0}
              onPress={() => { setReady({ qtys: Object.fromEntries(openItems.map((i) => [i.id, String(Number(i.issued_qty) - Number(i.ready_qty))])), file: null, note: '' }); setModal('ready'); }} />
            {openItems.length === 0 && !pendingNotice ? <Text style={styles.hint}>Mark ready becomes available once material has been issued to the floor.</Text> : null}
          </View>
        ) : null}
        {isAccounts && ['ready', 'partially_dispatched', 'in_process'].includes(wo.status) ? (
          <Button style={{ marginTop: 8 }} title="Prepare dispatch" onPress={() => navigation.navigate('EjwDispatchForm', { user, woId: wo.id })} />
        ) : null}

        <Text style={styles.sectionTitle}>Documents</Text>
        <Card>
          {wo.documents.length === 0 ? <Text style={styles.hint}>None yet.</Text> : wo.documents.map((d) => (
            <Text key={d.id} style={{ fontSize: 13, paddingVertical: 2 }}>{DOC_KINDS.find((k) => k.value === d.kind)?.label || d.kind}: {d.file_name}</Text>
          ))}
          {canEdit ? <Button style={{ marginTop: 8 }} title="+ Add document" kind="ghost" onPress={() => setModal('doc')} /> : null}
        </Card>

        {wo.history && wo.history.length ? (
          <>
            <Text style={styles.sectionTitle}>History</Text>
            <Card>{wo.history.map((h, i) => <Text key={i} style={{ fontSize: 12, paddingVertical: 2 }}>{fmtDate(h.changed_at)}: {h.new_status}{h.notes ? ` – ${h.notes}` : ''}</Text>)}</Card>
          </>
        ) : null}
      </ScrollView>

      <ActionModal visible={modal === 'doc'} title="Add document" onClose={close}
        footer={<><Button title="Cancel" kind="ghost" onPress={close} disabled={busy} /><Button title="Upload" onPress={upload} loading={busy} /></>}>
        <ErrorBanner message={formError} />
        <SimplePicker label="Kind" value={doc.kind} onChange={(v) => setDoc({ ...doc, kind: v })} options={DOC_KINDS} placeholder="-- Kind --" />
        <FileChip file={doc.file} onRemove={() => setDoc({ ...doc, file: null })} />
        <Button style={{ marginTop: 8 }} title={doc.file ? 'Choose another file' : 'Choose file'} kind="ghost" onPress={async () => { const f = await pickFile(); if (f) setDoc({ ...doc, file: f }); }} />
      </ActionModal>

      <ActionModal visible={modal === 'ready'} title="Mark ready" subtitle="Say how much is finished. Store will count it before it can be dispatched." onClose={close}
        footer={<><Button title="Cancel" kind="ghost" onPress={close} disabled={busy} /><Button title="Send to Store" kind="success" onPress={markReady} loading={busy} /></>}>
        <ErrorBanner message={formError} />
        {openItems.map((i) => (
          <Field key={i.id} label={`${i.description}: ready quantity (${i.unit})`} value={ready.qtys[i.id] || ''} keyboardType="decimal-pad"
            onChangeText={(t) => setReady({ ...ready, qtys: { ...ready.qtys, [i.id]: cleanDecimal(t, 3) } })}
            hint={`${q3(Number(i.issued_qty) - Number(i.ready_qty))} ${i.unit} issued and not yet marked ready`} />
        ))}
        <Text style={styles.label}>Inspection report {hasReport ? '(one is already attached; add a new one if needed)' : '*'}</Text>
        <FileChip file={ready.file} onRemove={() => setReady({ ...ready, file: null })} />
        <Button title={ready.file ? 'Choose another file' : 'Attach inspection report'} kind="ghost" onPress={async () => { const f = await pickFile(); if (f) setReady({ ...ready, file: f }); }} />
        <Field style={{ marginTop: 10 }} label="Note" value={ready.note} onChangeText={(t) => setReady({ ...ready, note: t })} multiline />
      </ActionModal>

      <ActionModal visible={modal === 'sc'} title="Short-close" subtitle={sc.item ? `${sc.item.description}: quantity that will never come back` : ''} onClose={close}
        footer={<><Button title="Cancel" kind="ghost" onPress={close} disabled={busy} /><Button title="Short-close" kind="danger" onPress={shortClose} loading={busy} /></>}>
        <ErrorBanner message={formError} />
        <Field label={`Quantity${sc.item ? ` (${sc.item.unit})` : ''} *`} value={sc.qty} keyboardType="decimal-pad" onChangeText={(t) => setSc({ ...sc, qty: cleanDecimal(t, 3) })}
          hint={sc.item ? `Open: ${q3(sc.item.pending_qty)} ${sc.item.unit}` : undefined} />
        <Field label="Reason *" value={sc.reason} onChangeText={(t) => setSc({ ...sc, reason: t })} multiline placeholder="e.g. scrapped in machining, customer waived" />
        <ErrorBanner kind="warning" message="This cannot be undone. Once every item is returned or short-closed, the work order closes." />
      </ActionModal>
      <Footer />
    </View>
  );
}
