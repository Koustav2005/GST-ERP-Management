import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { projectsAPI } from '../config/api';
import Footer from '../components/Footer';

export default function ExternalJobworkMaterialRequestScreen({ route, navigation }) {
  const { project, user } = route.params;
  const [materials, setMaterials] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('available'); // 'available' or 'create'
  
  // Form state
  const [selectedMaterials, setSelectedMaterials] = useState({}); // { materialId: { selected, quantity } }
  const [selectedWorker, setSelectedWorker] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMaterials();
    fetchWorkers();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await projectsAPI.getProjectExternalMaterials(project.id);
      setMaterials(response.data.materials || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      Alert.alert('Error', 'Failed to fetch available materials');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const response = await projectsAPI.getProjectWorkers(project.id);
      const workersList = response.data.workers || [];
      setWorkers(workersList);
      if (workersList.length > 0) {
        setSelectedWorker(workersList[0].worker_id.toString());
      }
    } catch (error) {
      console.error('Error fetching workers:', error);
      Alert.alert('Error', 'Failed to fetch project workers');
    }
  };

  const handleMaterialSelect = (materialId, selected) => {
    setSelectedMaterials(prev => ({
      ...prev,
      [materialId]: {
        ...prev[materialId],
        selected
      }
    }));
  };

  const handleQuantityChange = (materialId, quantity) => {
    setSelectedMaterials(prev => ({
      ...prev,
      [materialId]: {
        ...prev[materialId],
        quantity
      }
    }));
  };

  const validateForm = () => {
    // Check if at least one material is selected
    const selectedCount = Object.values(selectedMaterials).filter(m => m?.selected).length;
    if (selectedCount === 0) {
      Alert.alert('Error', 'Please select at least one material');
      return false;
    }

    // Check quantities
    for (const [materialId, data] of Object.entries(selectedMaterials)) {
      if (data?.selected) {
        const material = materials.find(m => m.id === parseInt(materialId));
        const quantity = parseFloat(data.quantity || 0);

        if (quantity <= 0) {
          Alert.alert('Error', `Please enter a valid quantity for ${material.material_name}`);
          return false;
        }

        if (quantity > material.available_quantity) {
          Alert.alert('Error', `Quantity for ${material.material_name} cannot exceed available quantity (${material.available_quantity})`);
          return false;
        }
      }
    }

    // Check worker selection
    if (!selectedWorker) {
      Alert.alert('Error', 'Please select a worker');
      return false;
    }

    return true;
  };

  const handleSubmitRequest = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      // Prepare items array
      const items = [];
      for (const [materialId, data] of Object.entries(selectedMaterials)) {
        if (data?.selected) {
          const material = materials.find(m => m.id === parseInt(materialId));
          items.push({
            material_name: material.material_name,
            requested_quantity: parseFloat(data.quantity),
            unit: material.unit,
            available_quantity: material.available_quantity
          });
        }
      }

      const requestData = {
        project_id: project.id,
        worker_id: parseInt(selectedWorker),
        company_id: user.company_id,
        request_notes: requestNotes || null,
        items
      };

      console.log('Submitting request data:', requestData);
      console.log('User company_id:', user.company_id);
      console.log('Project id:', project.id);
      console.log('Selected worker:', selectedWorker);

      const response = await projectsAPI.createExternalJobworkMaterialRequest(requestData);

      console.log('Request response:', response);

      Alert.alert(
        'Success',
        `Material request created successfully! Request ID: ${response.data.requestId}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setSelectedMaterials({});
              setSelectedWorker(workers.length > 0 ? workers[0].worker_id.toString() : '');
              setRequestNotes('');
              setSelectedTab('available');
              // Go back to project details
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting request:', error);
      console.error('Error response data:', error.response?.data);
      console.error('Error message:', error.message);
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to create request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>⬅ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>External Job Work Material</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'available' && styles.tabActive]}
          onPress={() => setSelectedTab('available')}
        >
          <Text style={[styles.tabText, selectedTab === 'available' && styles.tabTextActive]}>
            📦 Available Materials
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'create' && styles.tabActive]}
          onPress={() => setSelectedTab('create')}
        >
          <Text style={[styles.tabText, selectedTab === 'create' && styles.tabTextActive]}>
            ➕ Create Request
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#5856D6" />
            <Text style={styles.loaderText}>Loading materials...</Text>
          </View>
        ) : (
          <>
            {selectedTab === 'available' && (
              <View>
                <Text style={styles.sectionTitle}>Project External Job Work Inventory</Text>
                {materials.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No external job work materials available for this project</Text>
                  </View>
                ) : (
                  materials.map(material => (
                    <View key={material.id} style={styles.materialCard}>
                      <View style={styles.materialHeader}>
                        <View style={styles.materialInfo}>
                          <Text style={styles.materialName}>{material.material_name}</Text>
                          {material.batch_lot_number && (
                            <Text style={styles.batchText}>Batch: {material.batch_lot_number}</Text>
                          )}
                        </View>
                        <View style={styles.quantityBadge}>
                          <Text style={styles.quantityText}>{material.available_quantity} {material.unit}</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {selectedTab === 'create' && (
              <View>
                <Text style={styles.sectionTitle}>Create New Request</Text>

                {/* Material Selection */}
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Select Materials *</Text>
                  {materials.length === 0 ? (
                    <Text style={styles.emptyText}>No materials available to request</Text>
                  ) : (
                    materials.map(material => (
                      <View key={material.id} style={styles.materialCheckbox}>
                        <TouchableOpacity
                          style={styles.checkboxContainer}
                          onPress={() => handleMaterialSelect(material.id, !selectedMaterials[material.id]?.selected)}
                        >
                          {/* Custom Checkbox */}
                          <View style={[
                            styles.checkbox,
                            selectedMaterials[material.id]?.selected && styles.checkboxChecked
                          ]}>
                            {selectedMaterials[material.id]?.selected && (
                              <Text style={styles.checkboxCheckmark}>✓</Text>
                            )}
                          </View>
                          <View style={styles.materialCheckboxInfo}>
                            <Text style={styles.materialCheckboxName}>{material.material_name}</Text>
                            <Text style={styles.materialCheckboxQty}>Available: {material.available_quantity} {material.unit}</Text>
                          </View>
                        </TouchableOpacity>

                        {selectedMaterials[material.id]?.selected && (
                          <TextInput
                            style={styles.quantityInput}
                            placeholder="Enter quantity"
                            keyboardType="decimal-pad"
                            value={selectedMaterials[material.id]?.quantity?.toString() || ''}
                            onChangeText={(qty) => handleQuantityChange(material.id, qty)}
                          />
                        )}
                      </View>
                    ))
                  )}
                </View>

                {/* Worker Selection */}
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Select Worker (Who will collect) *</Text>
                  {workers.length === 0 ? (
                    <Text style={styles.emptyText}>No workers assigned to this project</Text>
                  ) : (
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={selectedWorker}
                        onValueChange={(itemValue) => setSelectedWorker(itemValue)}
                        style={styles.picker}
                      >
                        {workers.map(worker => (
                          <Picker.Item
                            key={worker.worker_id}
                            label={worker.worker_name}
                            value={worker.worker_id.toString()}
                          />
                        ))}
                      </Picker>
                    </View>
                  )}
                </View>

                {/* Notes */}
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.textInput, styles.notesInput]}
                    placeholder="Add any remarks or special instructions"
                    multiline
                    numberOfLines={4}
                    value={requestNotes}
                    onChangeText={setRequestNotes}
                  />
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                  onPress={handleSubmitRequest}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.submitBtnText}>Submit Request</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#5856D6',
    padding: 16,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: 5,
  },
  backText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 50,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#5856D6',
  },
  tabText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#5856D6',
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  loaderContainer: {
    alignItems: 'center',
    paddingTop: 50,
  },
  loaderText: {
    marginTop: 10,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 14,
  },
  materialCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  materialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  materialInfo: {
    flex: 1,
  },
  materialName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  batchText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  quantityBadge: {
    backgroundColor: '#E5E5EA',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quantityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  formSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 10,
  },
  materialCheckbox: {
    marginBottom: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#5856D6',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#5856D6',
  },
  checkboxCheckmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  materialCheckboxInfo: {
    flex: 1,
  },
  materialCheckboxName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  materialCheckboxQty: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  quantityInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1C1C1E',
    marginTop: 8,
    marginLeft: 34,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  pickerContainer: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    backgroundColor: '#F2F2F7',
  },
  textInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1C1C1E',
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#5856D6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
