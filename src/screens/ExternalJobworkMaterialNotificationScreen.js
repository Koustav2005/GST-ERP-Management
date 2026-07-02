import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, StyleSheet, Modal } from 'react-native';
import { projectsAPI } from '../config/api';

export default function ExternalJobworkMaterialNotificationScreen({ navigation, route }) {
  const { user } = route.params;
  const [jobWorks, setJobWorks] = useState([]);
  const [selectedJobWork, setSelectedJobWork] = useState(null);
  const [showJobWorkDropdown, setShowJobWorkDropdown] = useState(false);
  const [accountants, setAccountants] = useState([]);
  const [selectedAccountant, setSelectedAccountant] = useState(null);
  const [materialDescription, setMaterialDescription] = useState('');
  const [expectedArrivalDate, setExpectedArrivalDate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExternalJobWorks();
    fetchAccountants();
  }, []);

  const fetchExternalJobWorks = async () => {
    try {
      const response = await projectsAPI.getExternalJobWorks(user.company_id);
      console.log('Raw response:', response.data);
      
      // The backend now filters for external_job_work only, just use all results
      setJobWorks(response.data.requests || []);
      console.log('Fetched external job works:', response.data.requests);
    } catch (error) {
      console.error('Error fetching job works:', error);
      setJobWorks([]);
    }
  };

  const fetchAccountants = async () => {
    try {
      console.log('Fetching accountants for company:', user.company_id);
      const response = await projectsAPI.getAccountants(user.company_id);
      console.log('Full response:', response);
      console.log('Response data:', response.data);
      // The endpoint returns { accountants: [...] }
      const accountantsList = response.data?.accountants || [];
      console.log('Parsed accountants list:', accountantsList);
      setAccountants(accountantsList);
      if (accountantsList.length === 0) {
        console.warn('No accountants found for company:', user.company_id);
      }
    } catch (error) {
      console.error('Error fetching accountants:', error.message);
      console.error('Error details:', error.response?.data);
      setAccountants([]);
    }
  };

  const handleNotifyMaterial = async () => {
    if (!selectedJobWork || !selectedAccountant || !materialDescription || !expectedArrivalDate) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        job_work_id: selectedJobWork.id,
        npd_user_id: user.id,
        accountant_id: selectedAccountant.id,
        company_id: user.company_id,
        material_description: materialDescription,
        expected_arrival_date: expectedArrivalDate,
        material_details: {
          supplier: supplier || 'Not specified',
          po_number: poNumber || 'N/A'
        }
      };

      // Create new axios call directly since this is external-jobwork-materials API
      const api = require('../config/api').default;
      const response = await api.post(
        '/external-jobwork-materials/notify-material-arrival',
        payload
      );

      Alert.alert(
        'Success',
        `Notification sent to ${selectedAccountant.name}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setMaterialDescription('');
              setExpectedArrivalDate('');
              setSupplier('');
              setPoNumber('');
              setSelectedJobWork(null);
              setSelectedAccountant(null);
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notify About Material Arrival</Text>
        <Text style={styles.subtitle}>External Job Work Materials</Text>
      </View>

      {/* Select Job Work */}
      <View style={styles.section}>
        <Text style={styles.label}>Select External Job Work *</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowJobWorkDropdown(true)}
        >
          <Text style={styles.dropdownButtonText}>
            {selectedJobWork ? selectedJobWork.poen_number || `Job Work #${selectedJobWork.id}` : '-- Select Job Work --'}
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>

        <Modal
          visible={showJobWorkDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowJobWorkDropdown(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setShowJobWorkDropdown(false)}
          >
            <View style={styles.dropdownModal}>
              <ScrollView>
                {jobWorks.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No external job works available</Text>
                  </View>
                ) : (
                  jobWorks.map(job => (
                    <TouchableOpacity
                      key={job.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedJobWork(job);
                        setShowJobWorkDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>
                        {job.poen_number || `Job Work #${job.id}`}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>

      {/* Select Accountant */}
      <View style={styles.section}>
        <Text style={styles.label}>Select Accountant *</Text>
        <ScrollView style={styles.jobWorkList}>
          {accountants.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No accountants available</Text>
            </View>
          ) : (
            accountants.map(acc => (
              <TouchableOpacity
                key={acc.id}
                style={[
                  styles.jobWorkItem,
                  selectedAccountant?.id === acc.id && styles.selectedJobWork
                ]}
                onPress={() => setSelectedAccountant(acc)}
              >
                <Text style={styles.jobWorkName}>{acc.name}</Text>
                <Text style={styles.jobWorkPurpose}>{acc.email}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* Material Description */}
      <View style={styles.section}>
        <Text style={styles.label}>Material Description *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Steel plates, Plastic components"
          value={materialDescription}
          onChangeText={setMaterialDescription}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Expected Arrival Date */}
      <View style={styles.section}>
        <Text style={styles.label}>Expected Arrival Date *</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={expectedArrivalDate}
          onChangeText={setExpectedArrivalDate}
        />
      </View>

      {/* Supplier Information */}
      <View style={styles.section}>
        <Text style={styles.label}>Supplier Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Supplier name (optional)"
          value={supplier}
          onChangeText={setSupplier}
        />
      </View>

      {/* PO Number */}
      <View style={styles.section}>
        <Text style={styles.label}>PO Number</Text>
        <TextInput
          style={styles.input}
          placeholder="PO number (optional)"
          value={poNumber}
          onChangeText={setPoNumber}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleNotifyMaterial}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Sending...' : 'Send Notification'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ℹ️ How It Works</Text>
        <Text style={styles.infoText}>
          1. Select the external job work project{'\n'}
          2. Select specific accountant to notify{'\n'}
          3. Enter material description and arrival date{'\n'}
          4. Click "Send Notification"{'\n'}
          5. Accountant will receive notification and create challan
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15
  },
  header: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#9C27B0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  subtitle: {
    fontSize: 14,
    color: '#666'
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0'
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f9f9f9'
  },
  dropdownButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#333'
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#999'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center'
  },
  dropdownModal: {
    backgroundColor: '#fff',
    marginHorizontal: 30,
    borderRadius: 8,
    maxHeight: 300
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333'
  },
  jobWorkList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9'
  },
  jobWorkItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  selectedJobWork: {
    backgroundColor: '#E1BEE7'
  },
  jobWorkName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6
  },
  jobWorkPurpose: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic'
  },
  jobWorkStatus: {
    fontSize: 11,
    color: '#2196F3',
    marginTop: 4,
    fontWeight: '600'
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    fontSize: 13,
    color: '#999'
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 20
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10
  },
  primaryButton: {
    backgroundColor: '#9C27B0'
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  secondaryButton: {
    backgroundColor: '#eee',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600'
  },
  infoBox: {
    backgroundColor: '#E8EAF6',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 8
  },
  infoText: {
    fontSize: 13,
    color: '#3F51B5',
    lineHeight: 20
  }
});
