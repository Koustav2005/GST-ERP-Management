import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, StyleSheet, FlatList } from 'react-native';
import { default as api } from '../config/api';

export default function ExternalJobworkChallanScreen({ navigation, route }) {
  const { user } = route.params;
  const [notifications, setNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [storeIncharges, setStoreIncharges] = useState([]);
  const [selectedStoreIncharge, setSelectedStoreIncharge] = useState(null);
  const [materialsList, setMaterialsList] = useState([]);
  const [currentMaterial, setCurrentMaterial] = useState({
    material_name: '',
    quantity: '',
    unit: 'kg',
    hsn_code: '',
    gst_rate: '5'
  });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
    fetchStoreIncharges();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get(
        `/external-jobwork-materials/notifications/accountant/${user.id}/${user.company_id}`
      );
      setNotifications(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch notifications');
    }
  };

  const fetchStoreIncharges = async () => {
    try {
      const response = await api.get(`/users/by-role/store_incharge/${user.company_id}`);
      setStoreIncharges(response.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch store incharges');
    }
  };

  const addMaterial = () => {
    if (!currentMaterial.material_name || !currentMaterial.quantity) {
      Alert.alert('Error', 'Please enter material name and quantity');
      return;
    }

    setMaterialsList([...materialsList, { ...currentMaterial }]);
    setCurrentMaterial({
      material_name: '',
      quantity: '',
      unit: 'kg',
      hsn_code: '',
      gst_rate: '5'
    });
  };

  const removeMaterial = (index) => {
    const newList = materialsList.filter((_, i) => i !== index);
    setMaterialsList(newList);
  };

  const handleCreateChallan = async () => {
    console.log('=== CREATE CHALLAN DEBUG ===');
    console.log('selectedNotification:', selectedNotification);
    console.log('selectedStoreIncharge:', selectedStoreIncharge);
    console.log('materialsList:', materialsList);
    console.log('materialsList.length:', materialsList.length);
    
    if (!selectedNotification) {
      Alert.alert('Error', 'Please select a material notification');
      return;
    }
    if (!selectedStoreIncharge) {
      Alert.alert('Error', 'Please select a store incharge');
      return;
    }
    if (materialsList.length === 0) {
      Alert.alert('Error', 'Please add at least one material');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        notification_id: selectedNotification.id,
        job_work_id: selectedNotification.job_work_id,
        company_id: user.company_id,
        accountant_id: user.id,
        store_incharge_id: selectedStoreIncharge.id,
        material_description: selectedNotification.material_description,
        quantity: materialsList.reduce((sum, m) => sum + parseFloat(m.quantity), 0),
        unit: materialsList[0].unit,
        expected_arrival_date: selectedNotification.expected_arrival_date,
        notes: notes,
        materials_list: materialsList
      };

      console.log('Payload to send:', payload);

      const response = await api.post(
        '/external-jobwork-materials/create-challan',
        payload
      );

      Alert.alert(
        'Success',
        `Challan created: ${response.data.challan.challan_number}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setMaterialsList([]);
              setNotes('');
              setSelectedNotification(null);
              setSelectedStoreIncharge(null);
              fetchNotifications();
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create challan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create External Job Work Challan</Text>
        <Text style={styles.subtitle}>Accountant - Receive & Track Materials</Text>
      </View>

      {/* Select Notification */}
      <View style={styles.section}>
        <Text style={styles.label}>Select Material Notification *</Text>
        <ScrollView style={styles.notificationList}>
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No pending material notifications</Text>
            </View>
          ) : (
            notifications.map(notif => (
              <TouchableOpacity
                key={notif.id}
                style={[
                  styles.notificationItem,
                  selectedNotification?.id === notif.id && styles.selectedItem
                ]}
                onPress={() => setSelectedNotification(notif)}
              >
                <Text style={styles.itemTitle}>{notif.material_description}</Text>
                <Text style={styles.itemSubtitle}>
                  📌 Project: {notif.job_work_id}
                </Text>
                <Text style={styles.itemSubtitle}>
                  📅 Expected: {notif.expected_arrival_date}
                </Text>
                <Text style={styles.itemStatus}>
                  Status: {notif.status} • By: {notif.npd_name}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* Select Store Incharge */}
      <View style={styles.section}>
        <Text style={styles.label}>Assign to Store Incharge *</Text>
        <ScrollView style={styles.list}>
          {storeIncharges.map(si => (
            <TouchableOpacity
              key={si.id}
              style={[
                styles.item,
                selectedStoreIncharge?.id === si.id && styles.selectedItem
              ]}
              onPress={() => setSelectedStoreIncharge(si)}
            >
              <Text style={styles.itemTitle}>{si.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Add Materials */}
      <View style={styles.section}>
        <Text style={styles.label}>Add Materials</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Material Name"
          value={currentMaterial.material_name}
          onChangeText={(text) => setCurrentMaterial({...currentMaterial, material_name: text})}
        />

        <View style={styles.row}>
          <TextInput
            style={[styles.input, {flex: 1, marginRight: 10}]}
            placeholder="Quantity"
            value={currentMaterial.quantity}
            onChangeText={(text) => setCurrentMaterial({...currentMaterial, quantity: text})}
            keyboardType="decimal-pad"
          />
          <TextInput
            style={[styles.input, {flex: 0.4}]}
            placeholder="Unit"
            value={currentMaterial.unit}
            onChangeText={(text) => setCurrentMaterial({...currentMaterial, unit: text})}
          />
        </View>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, {flex: 1, marginRight: 10}]}
            placeholder="HSN Code"
            value={currentMaterial.hsn_code}
            onChangeText={(text) => setCurrentMaterial({...currentMaterial, hsn_code: text})}
          />
          <TextInput
            style={[styles.input, {flex: 0.4}]}
            placeholder="GST %"
            value={currentMaterial.gst_rate}
            onChangeText={(text) => setCurrentMaterial({...currentMaterial, gst_rate: text})}
            keyboardType="decimal-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, styles.addButton]}
          onPress={addMaterial}
        >
          <Text style={styles.buttonText}>+ Add Material</Text>
        </TouchableOpacity>

        {/* Materials List */}
        {materialsList.length > 0 && (
          <View style={styles.materialsListContainer}>
            <Text style={styles.materialsTitle}>Added Materials:</Text>
            {materialsList.map((material, index) => (
              <View key={index} style={styles.materialItem}>
                <View style={styles.materialInfo}>
                  <Text style={styles.materialName}>{material.material_name}</Text>
                  <Text style={styles.materialDetails}>
                    {material.quantity} {material.unit} • HSN: {material.hsn_code || 'N/A'} • GST: {material.gst_rate}%
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeMaterial(index)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, {minHeight: 80}]}
          placeholder="Special instructions or notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleCreateChallan}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating Challan...' : 'Create Challan'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
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
    borderBottomColor: '#FF9800'
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
    borderLeftColor: '#FF9800'
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
    backgroundColor: '#f9f9f9',
    marginBottom: 10
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10
  },
  notificationList: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9'
  },
  list: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9'
  },
  notificationItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  selectedItem: {
    backgroundColor: '#FFE0B2'
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4
  },
  itemStatus: {
    fontSize: 11,
    color: '#666',
    marginTop: 4
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    fontSize: 12,
    color: '#999'
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  addButton: {
    backgroundColor: '#4CAF50',
    marginBottom: 10
  },
  primaryButton: {
    backgroundColor: '#FF9800',
    marginBottom: 10
  },
  secondaryButton: {
    backgroundColor: '#eee',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600'
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 20
  },
  materialsListContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee'
  },
  materialsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10
  },
  materialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800'
  },
  materialInfo: {
    flex: 1
  },
  materialName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333'
  },
  materialDetails: {
    fontSize: 11,
    color: '#999',
    marginTop: 4
  },
  removeText: {
    color: '#E53935',
    fontSize: 12,
    fontWeight: '600'
  }
});
