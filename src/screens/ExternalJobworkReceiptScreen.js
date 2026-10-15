import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, StyleSheet } from 'react-native';
import { default as api } from '../config/api';

export default function ExternalJobworkReceiptScreen({ navigation, route }) {
  const { user } = route.params;
  const [challans, setChallans] = useState([]);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [challanDetails, setChallanDetails] = useState(null);
  const [receivedMaterials, setReceivedMaterials] = useState([]);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchChallans();
  }, []);

  const fetchChallans = async () => {
    try {
      console.log('🔄 Fetching pending challans for user:', user.id);
      const response = await api.get(
        `/external-jobwork-materials/challans/store-incharge/${user.id}/${user.company_id}`
      );
      console.log('✅ Challans fetched:', response.data);
      setChallans(response.data);
    } catch (error) {
      console.error('❌ Error fetching challans:', error);
      Alert.alert('Error', 'Failed to fetch challans');
    }
  };

  const fetchChallanDetails = async (challanId) => {
    try {
      console.log('🔄 Fetching challan details for ID:', challanId);
      const response = await api.get(
        `/external-jobwork-materials/challan-details/${challanId}`
      );
      
      console.log('✅ Challan details response:', response.data);
      console.log('📦 Challan object:', response.data.challan);
      console.log('📋 Items:', response.data.items);
      
      setChallanDetails(response.data);
      
      // Initialize received materials with zero quantities
      // Backend returns 'items', not 'materials'
      const materials = response.data.items || response.data.materials || [];
      console.log('📝 Materials to map:', materials);
      
      const initialReceived = materials.map(m => ({
        material_name: m.material_name,
        received_quantity: '0'
      }));
      
      console.log('✍️ Initial received materials:', initialReceived);
      setReceivedMaterials(initialReceived);
    } catch (error) {
      console.error('❌ Error fetching challan details:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert('Error', 'Failed to fetch challan details: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleChallanSelect = (challan) => {
    console.log('🎯 Selected challan:', challan);
    setSelectedChallan(challan);
    fetchChallanDetails(challan.id);
  };

  const updateReceivedQuantity = (index, quantity) => {
    const updated = [...receivedMaterials];
    updated[index].received_quantity = quantity;
    setReceivedMaterials(updated);
  };

  const handleReceiveMaterial = async () => {
    if (!selectedChallan || receivedMaterials.length === 0) {
      Alert.alert('Error', 'Please select a challan and enter received quantities');
      return;
    }

    const hasQuantities = receivedMaterials.some(m => parseFloat(m.received_quantity) > 0);
    if (!hasQuantities) {
      Alert.alert('Error', 'Please enter at least one received quantity');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        store_incharge_id: user.id,
        received_materials: receivedMaterials.map(m => ({
          material_name: m.material_name,
          received_quantity: parseFloat(m.received_quantity)
        })),
        notes: inspectionNotes
      };

      console.log('📤 Sending receive-challan payload:', {
        challanId: selectedChallan.id,
        payload
      });

      const response = await api.post(
        `/external-jobwork-materials/receive-challan/${selectedChallan.id}`,
        payload
      );

      console.log('✅ Receive response:', response.data);

      Alert.alert(
        'Success',
        `Challan ${response.data.challan.challan_number} marked as received`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedChallan(null);
              setChallanDetails(null);
              setReceivedMaterials([]);
              setInspectionNotes('');
              fetchChallans();
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error receiving material:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert('Error', error.response?.data?.error || 'Failed to receive material');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Receive External Job Work Materials</Text>
        <Text style={styles.subtitle}>Store Incharge - Receipt & Verification</Text>
      </View>

      {/* Select Challan */}
      {!selectedChallan ? (
        <View style={styles.section}>
          <Text style={styles.label}>Select Pending Challan *</Text>
          <ScrollView style={styles.challanList}>
            {challans.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No pending challans</Text>
              </View>
            ) : (
              challans.map(challan => (
                <TouchableOpacity
                  key={challan.id}
                  style={styles.challanItem}
                  onPress={() => handleChallanSelect(challan)}
                >
                  <View>
                    <Text style={styles.challanNumber}>{challan.challan_number}</Text>
                    <Text style={styles.challanDetail}>
                      📌 Project: {challan.job_work_id}
                    </Text>
                    <Text style={styles.challanDetail}>
                      Material: {challan.material_description}
                    </Text>
                    <Text style={styles.challanDetail}>
                      Items: {challan.material_count}
                    </Text>
                    <Text style={styles.challanDetail}>
                      📅 Expected: {challan.expected_arrival_date}
                    </Text>
                    <Text style={styles.accountantName}>
                      Created by: {challan.accountant_name}
                    </Text>
                  </View>
                  <View style={styles.arrow}>
                    <Text style={styles.arrowText}>→</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      ) : (
        <>
          {/* Challan Selected - Show Details */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setSelectedChallan(null);
                setChallanDetails(null);
              }}
            >
              <Text style={styles.backButtonText}>← Back to Challans</Text>
            </TouchableOpacity>

            <View style={styles.challanHeader}>
              <Text style={styles.headerTitle}>{challanDetails?.challan?.challan_number || selectedChallan.challan_number}</Text>
              <Text style={styles.headerSubtitle}>
                {challanDetails?.challan?.material_description || selectedChallan.material_description}
              </Text>
              <View style={styles.headerInfo}>
                <Text style={styles.headerInfoText}>
                  📌 Project: {challanDetails?.challan?.project_name || 'N/A'}
                </Text>
                <Text style={styles.headerInfoText}>
                  📊 Job ID: {challanDetails?.challan?.job_id || 'N/A'}
                </Text>
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.headerInfoText}>
                  📅 Expected: {challanDetails?.challan?.expected_arrival_date ? new Date(challanDetails.challan.expected_arrival_date).toLocaleDateString() : (selectedChallan?.expected_arrival_date ? new Date(selectedChallan.expected_arrival_date).toLocaleDateString() : 'N/A')}
                </Text>
                <Text style={styles.headerInfoText}>
                  👤 NPD: {challanDetails?.challan?.npd_name || 'N/A'}
                </Text>
              </View>
              <Text style={styles.jobWorkId}>
                Job Work ID: {challanDetails?.challan?.job_work_id || selectedChallan.job_work_id}
              </Text>
            </View>

            {/* Materials to Receive */}
            {challanDetails && (
              <View style={styles.materialsSection}>
                <Text style={styles.materialsTitle}>Materials to Receive:</Text>
                
                {receivedMaterials.map((material, index) => (
                  <View key={index} style={styles.materialRow}>
                    <View style={styles.materialInfo}>
                      <Text style={styles.materialName}>
                        {material.material_name}
                      </Text>
                      <Text style={styles.materialExpected}>
                        Expected: {(challanDetails.items || challanDetails.materials)?.[index]?.quantity} {(challanDetails.items || challanDetails.materials)?.[index]?.unit}
                      </Text>
                    </View>
                    <TextInput
                      style={styles.quantityInput}
                      placeholder="Received"
                      value={material.received_quantity}
                      onChangeText={(text) => updateReceivedQuantity(index, text)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                ))}
              </View>
            )}

            {/* Inspection Notes */}
            <View style={styles.notesSection}>
              <Text style={styles.label}>Inspection Notes</Text>
              <TextInput
                style={[styles.input, {minHeight: 100}]}
                placeholder="Any damage, discrepancies, or special notes..."
                value={inspectionNotes}
                onChangeText={setInspectionNotes}
                multiline
                numberOfLines={5}
              />
            </View>

            {/* Confirmation */}
            <View style={styles.confirmationBox}>
              <Text style={styles.confirmationText}>
                ✓ Verify all quantities are correct before submitting
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.receiveButton]}
                onPress={handleReceiveMaterial}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Processing...' : 'Mark as Received'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setSelectedChallan(null);
                  setChallanDetails(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ℹ️ Receipt Process</Text>
        <Text style={styles.infoText}>
          1. Select a pending challan{'\n'}
          2. Enter received quantities for each material{'\n'}
          3. Add inspection notes if needed{'\n'}
          4. Click "Mark as Received"{'\n'}
          5. Materials logged to external inventory{'\n'}
          6. Accountant gets confirmation notification
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
    color: '#666',
    marginBottom: 10
  },
  fixButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 10
  },
  fixButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600'
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 15,
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
  challanList: {
    maxHeight: 400,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9'
  },
  challanItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  challanNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2196F3'
  },
  challanDetail: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  accountantName: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic'
  },
  arrow: {
    marginLeft: 10
  },
  arrowText: {
    fontSize: 18,
    color: '#2196F3'
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    fontSize: 14,
    color: '#999'
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    marginBottom: 15
  },
  backButtonText: {
    color: '#1976D2',
    fontSize: 13,
    fontWeight: '600'
  },
  challanHeader: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976D2'
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#555',
    marginTop: 4
  },
  headerInfo: {
    marginTop: 8
  },
  headerInfoText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  jobWorkId: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  materialsSection: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3'
  },
  materialsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10
  },
  materialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#2196F3'
  },
  materialInfo: {
    flex: 1
  },
  materialName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333'
  },
  materialExpected: {
    fontSize: 11,
    color: '#999',
    marginTop: 4
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    width: 80,
    fontSize: 12,
    backgroundColor: '#f0f0f0'
  },
  notesSection: {
    marginBottom: 15
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#333',
    backgroundColor: '#f9f9f9'
  },
  confirmationBox: {
    backgroundColor: '#C8E6C9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#388E3C'
  },
  confirmationText: {
    fontSize: 12,
    color: '#1B5E20',
    fontWeight: '500'
  },
  buttonContainer: {
    marginTop: 15
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10
  },
  receiveButton: {
    backgroundColor: '#2196F3'
  },
  cancelButton: {
    backgroundColor: '#eee',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 14,
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
