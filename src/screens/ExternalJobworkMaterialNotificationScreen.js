import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, StyleSheet } from 'react-native';
import { projectsAPI } from '../config/api';

export default function ExternalJobworkMaterialNotificationScreen({ navigation, route }) {
  const { user } = route.params;
  const [jobWorks, setJobWorks] = useState([]);
  const [selectedJobWork, setSelectedJobWork] = useState(null);
  const [materialDescription, setMaterialDescription] = useState('');
  const [expectedArrivalDate, setExpectedArrivalDate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExternalJobWorks();
  }, []);

  const fetchExternalJobWorks = async () => {
    try {
      // Get all job works for the company
      const response = await projectsAPI.getExternalJobWorks(user.company_id);
      // Filter only external job works
      const externalJobs = response.data.requests.filter(j => j.job_work_type === 'external' || j.type === 'external');
      setJobWorks(externalJobs.length > 0 ? externalJobs : response.data.requests || []);
    } catch (error) {
      console.log('Note: Job work data not yet available, using empty list');
      setJobWorks([]);
    }
  };

  const handleNotifyMaterial = async () => {
    if (!selectedJobWork || !materialDescription || !expectedArrivalDate) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        job_work_id: selectedJobWork.id,
        npd_user_id: user.id,
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
        `Material arrival notification sent to ${response.data.notifications.length} accountants`,
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
        <ScrollView style={styles.jobWorkList}>
          {jobWorks.map(job => (
            <TouchableOpacity
              key={job.id}
              style={[
                styles.jobWorkItem,
                selectedJobWork?.id === job.id && styles.selectedJobWork
              ]}
              onPress={() => setSelectedJobWork(job)}
            >
              <Text style={styles.jobWorkName}>{job.external_company_name}</Text>
              <Text style={styles.jobWorkId}>Job ID: {job.id}</Text>
            </TouchableOpacity>
          ))}
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
          2. Enter material description and arrival date{'\n'}
          3. Click "Send Notification"{'\n'}
          4. All accountants in your company will be notified{'\n'}
          5. Accountant will create a challan for storage and tracking
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
  jobWorkList: {
    maxHeight: 150,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  jobWorkId: {
    fontSize: 12,
    color: '#999',
    marginTop: 4
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
