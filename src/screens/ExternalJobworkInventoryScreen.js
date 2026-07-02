import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, FlatList } from 'react-native';
import { default as api } from '../config/api';

export default function ExternalJobworkInventoryScreen({ navigation, route }) {
  const { user } = route.params;
  const [jobWorks, setJobWorks] = useState([]);
  const [selectedJobWork, setSelectedJobWork] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobWorks();
  }, []);

  const fetchJobWorks = async () => {
    try {
      setLoading(true);
      // Get all external job works for this company
      const response = await api.get(`/projects/job-work/company/${user.company_id}`);
      const jobWorksList = response.data?.requests || [];
      setJobWorks(jobWorksList);
      console.log('Fetched job works:', jobWorksList);
    } catch (error) {
      console.error('Error fetching job works:', error);
      Alert.alert('Error', 'Failed to fetch job works');
      setJobWorks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryForJobWork = async (jobWorkId) => {
    try {
      setLoading(true);
      const response = await api.get(
        `/external-jobwork-materials/inventory/${jobWorkId}/${user.company_id}`
      );
      setInventoryItems(response.data || []);
      console.log('Fetched inventory for job work', jobWorkId, ':', response.data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      Alert.alert('Error', 'Failed to fetch inventory');
      setInventoryItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJobWorkSelect = (jobWork) => {
    setSelectedJobWork(jobWork);
    fetchInventoryForJobWork(jobWork.id);
  };

  const getTotalReceived = () => {
    return inventoryItems.reduce((sum, item) => sum + (parseFloat(item.received_quantity) || 0), 0);
  };

  const getTotalOrdered = () => {
    return inventoryItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>External Job Work Inventory</Text>
        <Text style={styles.subtitle}>View all received materials</Text>
      </View>

      {/* Select Job Work */}
      <View style={styles.section}>
        <Text style={styles.label}>Select External Job Work</Text>
        <ScrollView style={styles.jobWorkList}>
          {jobWorks.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No external job works available</Text>
            </View>
          ) : (
            jobWorks.map(job => (
              <TouchableOpacity
                key={job.id}
                style={[
                  styles.jobWorkItem,
                  selectedJobWork?.id === job.id && styles.selectedItem
                ]}
                onPress={() => handleJobWorkSelect(job)}
              >
                <Text style={styles.jobWorkName}>
                  {job.poen_number || `Job Work #${job.id}`}
                </Text>
                <Text style={styles.jobWorkProject}>{job.project_name}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* Inventory Details */}
      {selectedJobWork && (
        <>
          <View style={styles.section}>
            <View style={styles.summaryBox}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Ordered</Text>
                <Text style={styles.summaryValue}>{getTotalOrdered().toFixed(2)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Received</Text>
                <Text style={styles.summaryValue} style={{color: '#4CAF50'}}>
                  {getTotalReceived().toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Pending</Text>
                <Text style={styles.summaryValue} style={{color: '#FF9800'}}>
                  {(getTotalOrdered() - getTotalReceived()).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Materials List */}
          <View style={styles.section}>
            <Text style={styles.materialsTitle}>Materials ({inventoryItems.length})</Text>
            
            {inventoryItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No materials received yet</Text>
              </View>
            ) : (
              inventoryItems.map((item, index) => (
                <View key={index} style={styles.materialCard}>
                  <View style={styles.materialHeader}>
                    <View style={{flex: 1}}>
                      <Text style={styles.materialName}>{item.material_name}</Text>
                      <Text style={styles.materialChallan}>Challan: {item.challan_number}</Text>
                    </View>
                    <Text style={[
                      styles.statusBadge,
                      item.status === 'received' ? styles.statusReceived : styles.statusPending
                    ]}>
                      {item.status || 'pending'}
                    </Text>
                  </View>
                  
                  <View style={styles.materialDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Ordered:</Text>
                      <Text style={styles.detailValue}>
                        {item.quantity} {item.unit}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Received:</Text>
                      <Text style={styles.detailValue}>
                        {item.received_quantity || '0'} {item.unit}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      )}

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ℹ️ Inventory Information</Text>
        <Text style={styles.infoText}>
          This view shows all materials received for external job works.{'\n'}
          Materials are organized by job work and challan.{'\n'}
          Track quantities and status of all received items.
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
    borderBottomColor: '#2196F3'
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
    marginBottom: 15,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3'
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
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
  selectedItem: {
    backgroundColor: '#E3F2FD'
  },
  jobWorkName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3'
  },
  jobWorkProject: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
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
  summaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1
  },
  summaryLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600'
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 4
  },
  materialsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10
  },
  materialCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3'
  },
  materialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  materialName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333'
  },
  materialChallan: {
    fontSize: 11,
    color: '#999',
    marginTop: 4
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '600',
    color: '#fff'
  },
  statusReceived: {
    backgroundColor: '#4CAF50'
  },
  statusPending: {
    backgroundColor: '#FF9800'
  },
  materialDetails: {
    marginTop: 4
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4
  },
  detailLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: 11,
    color: '#333',
    fontWeight: '600'
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 8
  },
  infoText: {
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 18
  }
});
