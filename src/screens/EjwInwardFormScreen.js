import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { ejwAPI, masterCustomersAPI, jobworkDcsAPI } from '../config/api';
import { apiErrorMessage, appendFile, notify, today } from '../utils/jobwork';
import { pickFile, takePhoto } from '../utils/ejw';
import { Button, Card, ErrorBanner, Field, ScreenHeader, styles } from '../components/jobwork/common';
import DateField from '../components/jobwork/DateField';
import ItemsEditor, { blankItem, itemsPayload } from '../components/ejw/ItemsEditor';
import { FileChip, Loading, SimplePicker } from '../components/ejw/parts';
import Footer from '../components/Footer';

// Customer material inward (Store). S1: the customer's own DC. S2: sent by a third party (customer DC can follow).
// S3: against an open job that is waiting for material.
export default function EjwInwardFormScreen({ route, navigation }) {
  const { user } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dupe, setDupe] = useState(null); // { inward_id, inward_no } from a 409
  const [customers, setCustomers] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [jobs, setJobs] = useState([]);

  const [againstJob, setAgainstJob] = useState(false);
  const [woId, setWoId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [thirdParty, setThirdParty] = useState(false);
  const [dcNo, setDcNo] = useState('');
  const [dcDate, setDcDate] = useState('');
  const [supplier, setSupplier] = useState({ name: '', gstin: '', dc_no: '', dc_date: '' });
  const [receivedDate, setReceivedDate] = useState(today());
  const [vehicle, setVehicle] = useState('');
  const [eway, setEway] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([blankItem()]);
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [c, s, a, b] = await Promise.all([
          masterCustomersAPI.getAll(), jobworkDcsAPI.getStockItems(),
          ejwAPI.listWorkOrders({ status: 'awaiting_material' }), ejwAPI.listWorkOrders({ status: 'open' }),
        ]);
        setCustomers(c.data.customers || []);
        setStockItems(s.data.stock_items || []);
        setJobs([...(a.data.work_orders || []), ...(b.data.work_orders || [])]);
      } catch (e) {
        setError(apiErrorMessage(e, 'Could not load customers and stock items.'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const job = jobs.find((j) => String(j.id) === String(woId));
  const effectiveCustomer = againstJob && job ? String(job.customer_id) : customerId;

  const save = async () => {
    setError('');
    setDupe(null);
    if (!effectiveCustomer) return setError(againstJob ? 'Choose the open job this material is for.' : 'Choose the customer.');
    setSaving(true);
    try {
      const res = await ejwAPI.createInward({
        customer_id: Number(effectiveCustomer), received_date: receivedDate, vehicle_no: vehicle, eway_bill_no: eway, notes,
        third_party: thirdParty, customer_dc_no: dcNo, customer_dc_date: dcDate,
        supplier_name: supplier.name, supplier_gstin: supplier.gstin, supplier_dc_no: supplier.dc_no, supplier_dc_date: supplier.dc_date,
        against_wo_id: againstJob && woId ? Number(woId) : undefined,
        items: itemsPayload(items),
      });
      const inward = res.data.inward;
      let photoFailures = 0;
      for (const p of photos) {
        try {
          const fd = new FormData();
          fd.append('kind', 'photo');
          await appendFile(fd, 'file', p);
          await ejwAPI.uploadInwardDocument(inward.id, fd);
        } catch (e) { photoFailures += 1; }
      }
      const warnings = (res.data.warnings || []).map((w) => w.message);
      const extra = [...warnings, photoFailures ? `${photoFailures} photo(s) could not be uploaded; add them from the inward.` : ''].filter(Boolean);
      notify('Material received', `${inward.inward_no} saved.${extra.length ? `\n\n${extra.join('\n')}` : ''}`);
      navigation.replace('EjwInwardDetail', { user, inwardId: inward.id });
    } catch (e) {
      const d = e.response && e.response.data;
      if (e.response && e.response.status === 409 && d && d.code === 'DC_ALREADY_RECEIVED') setDupe({ inward_id: d.inward_id, inward_no: d.inward_no });
      setError(apiErrorMessage(e, 'Could not save the inward.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.container}><ScreenHeader title="Customer Material Inward" onBack={() => navigation.goBack()} /><Loading /></View>;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Customer Material Inward" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={error} />
        {dupe ? (
          <Button title={`Add a receipt to ${dupe.inward_no} instead`} kind="success"
            onPress={() => navigation.replace('EjwInwardDetail', { user, inwardId: dupe.inward_id, openReceipt: true })} />
        ) : null}

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.label}>Against an open job</Text>
              <Text style={styles.hint}>The job already exists and is waiting for this material (created from an enquiry PO).</Text>
            </View>
            <Switch value={againstJob} onValueChange={(v) => { setAgainstJob(v); setWoId(''); }} />
          </View>
          {againstJob ? (
            <SimplePicker label="Open job *" value={woId} onChange={setWoId} placeholder="-- Select job --"
              options={jobs.map((j) => ({ value: j.id, label: `${j.wo_no} · ${j.customer_name}${j.description ? ` · ${j.description.slice(0, 30)}` : ''}` }))}
              hint={jobs.length === 0 ? 'No job is waiting for material.' : job ? `Customer: ${job.customer_name}` : undefined} />
          ) : (
            <SimplePicker label="Customer *" value={customerId} onChange={setCustomerId} placeholder="-- Select customer --"
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
              hint={customers.length === 0 ? 'No customers yet. Ask Accounts to add the customer in Customer Master.' : undefined} />
          )}
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.label}>Sent by a third party</Text>
              <Text style={styles.hint}>The customer asked a supplier to send it to us. The customer's own DC can be attached later.</Text>
            </View>
            <Switch value={thirdParty} onValueChange={setThirdParty} />
          </View>
          {thirdParty ? (
            <View style={{ marginTop: 10 }}>
              <Field label="Supplier name *" value={supplier.name} onChangeText={(t) => setSupplier({ ...supplier, name: t })} />
              <Field label="Supplier GSTIN" value={supplier.gstin} autoCapitalize="characters" maxLength={15} onChangeText={(t) => setSupplier({ ...supplier, gstin: t.toUpperCase() })} />
              <Field label="Supplier DC no. *" value={supplier.dc_no} onChangeText={(t) => setSupplier({ ...supplier, dc_no: t })} />
              <DateField label="Supplier DC date" value={supplier.dc_date} onChange={(v) => setSupplier({ ...supplier, dc_date: v })} optional />
            </View>
          ) : null}
          <Field label={thirdParty ? "Customer's own DC no. (if you have it)" : "Customer's DC no. *"} value={dcNo} onChangeText={setDcNo} />
          <DateField label={thirdParty ? 'Customer DC date' : 'Customer DC date *'} value={dcDate} onChange={setDcDate} optional />
        </Card>

        <Text style={styles.sectionTitle}>Items</Text>
        <ItemsEditor items={items} setItems={setItems} stockItems={stockItems} />

        <Text style={styles.sectionTitle}>Delivery</Text>
        <Card>
          <DateField label="Received on *" value={receivedDate} onChange={setReceivedDate} />
          <Field label="Vehicle no." value={vehicle} onChangeText={(t) => setVehicle(t.toUpperCase())} autoCapitalize="characters" />
          <Field label="E-way bill no." value={eway} keyboardType="numeric" maxLength={12} onChangeText={(t) => setEway(t.replace(/\D/g, ''))} hint="12 digits, if the customer sent one" />
          <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
          <Text style={styles.label}>Photos of the material</Text>
          {photos.map((p, i) => <FileChip key={i} file={p} onRemove={() => setPhotos((ps) => ps.filter((_, n) => n !== i))} />)}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <Button style={{ flex: 1 }} title="Take photo" kind="ghost" onPress={async () => { const p = await takePhoto(); if (p) setPhotos((ps) => [...ps, p]); }} />
            <Button style={{ flex: 1 }} title="Choose file" kind="ghost" onPress={async () => { const p = await pickFile(['image/*']); if (p) setPhotos((ps) => [...ps, p]); }} />
          </View>
        </Card>

        <Button title="Save inward" onPress={save} loading={saving} style={{ marginTop: 10 }} />
      </ScrollView>
      <Footer />
    </View>
  );
}
