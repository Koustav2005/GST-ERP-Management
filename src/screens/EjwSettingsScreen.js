import React, { useState } from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { docSequencesAPI, ejwAPI } from '../config/api';
import { apiErrorMessage, notify } from '../utils/jobwork';
import { Button, Card, ErrorBanner, Field, ScreenHeader, styles } from '../components/jobwork/common';
import { KV, Loading, roleOf, useScreenLoad } from '../components/ejw/parts';
import Footer from '../components/Footer';

// Document numbering and our own details, as printed on every delivery challan and tax invoice.
// Management changes them; Accounts can look.
export default function EjwSettingsScreen({ route, navigation }) {
  const { user } = route.params;
  const canEdit = roleOf(user) === 'management';
  const [seqs, setSeqs] = useState([]);
  const [company, setCompany] = useState({ name: '', address: '', gst_number: '', state: '' });
  const [error2, setError2] = useState('');
  const [busy, setBusy] = useState('');

  const { loading, error, reload } = useScreenLoad(async () => {
    const [s, c] = await Promise.all([docSequencesAPI.getAll(), ejwAPI.getCompanyProfile()]);
    setSeqs(s.data.sequences || []);
    const co = c.data.company || {};
    setCompany({ name: co.name || '', address: co.address || '', gst_number: co.gst_number || '', state: co.state || '' });
  });

  const change = async (series, patch) => {
    setError2(''); setBusy(series);
    try { const r = await docSequencesAPI.update(series, patch); setSeqs(r.data.sequences); } catch (e) { setError2(apiErrorMessage(e, 'Could not change the setting.')); } finally { setBusy(''); }
  };
  const saveCompany = async () => {
    setError2(''); setBusy('company');
    try {
      const r = await ejwAPI.updateCompanyProfile({ address: company.address, gst_number: company.gst_number });
      setCompany({ ...company, ...r.data.company, address: r.data.company.address || '', gst_number: r.data.company.gst_number || '', state: r.data.company.state || '' });
      notify('Saved', 'These details are printed on new documents.');
    } catch (e) { setError2(apiErrorMessage(e, 'Could not save.')); } finally { setBusy(''); }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Document Settings" onBack={() => navigation.goBack()} />
      {loading ? <Loading /> : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ErrorBanner message={error || error2} />
          <Text style={styles.sectionTitle}>Our details on printed documents</Text>
          <Card>
            <KV label="Company" value={company.name} bold />
            <Field label="Address" value={company.address} onChangeText={(t) => setCompany({ ...company, address: t })} multiline editable={canEdit} />
            <Field label="GSTIN" value={company.gst_number} autoCapitalize="characters" maxLength={15} onChangeText={(t) => setCompany({ ...company, gst_number: t.toUpperCase() })} editable={canEdit}
              hint={`State: ${company.state || 'not set'} (taken from the GSTIN; decides CGST+SGST vs IGST)`} />
            {canEdit ? <Button title="Save" onPress={saveCompany} loading={busy === 'company'} /> : <Text style={styles.hint}>Only Management can change these.</Text>}
          </Card>

          <Text style={styles.sectionTitle}>Numbering</Text>
          {seqs.map((s) => (
            <Card key={s.series}>
              <Text style={{ fontWeight: '700' }}>{s.label} ({s.prefix}...)</Text>
              <KV label="Last used" value={s.last_value ? String(s.last_value) : 'none yet'} />
              <KV label="Next number" value={s.next_number} />
              {s.financial_year ? <KV label="Financial year" value={s.financial_year} /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={{ flex: 1, fontSize: 13 }}>Restart every financial year (April)</Text>
                <Switch value={!!s.reset_yearly} disabled={!canEdit || busy === s.series} onValueChange={(v) => change(s.series, { reset_yearly: v })} />
              </View>
              {s.can_be_manual ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ fontSize: 13 }}>Numbers come from Tally</Text>
                    <Text style={styles.hint}>{s.number_source === 'manual' ? 'Accounts must type this number on every document. The app never invents one.' : 'The app numbers it automatically; Accounts may still type a Tally number.'}</Text>
                  </View>
                  <Switch value={s.number_source === 'manual'} disabled={!canEdit || busy === s.series} onValueChange={(v) => change(s.series, { number_source: v ? 'manual' : 'app' })} />
                </View>
              ) : null}
            </Card>
          ))}
        </ScrollView>
      )}
      <Footer />
    </View>
  );
}
