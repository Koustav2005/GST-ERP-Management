import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { projectsAPI } from '../config/api';

export default function MinorOrderScreen({ route, navigation }) {
  const { user } = route.params;
  const [order, setOrder] = useState({
    item_name: '',
    hsn: '',
    quantity: '',
    unit: '',
    deadline_date: '',
  });
  const [orderItems, setOrderItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleAddToOrder = () => {
    if (!order.item_name.trim()) {
      Alert.alert('Error', 'Please enter item name');
      return;
    }

    if (!order.quantity || parseFloat(order.quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    if (!order.unit.trim()) {
      Alert.alert('Error', 'Please enter unit');
      return;
    }

    if (!order.deadline_date.trim()) {
      Alert.alert('Error', 'Please enter deadline date');
      return;
    }

    const newItem = {
      item_name: order.item_name,
      hsn: order.hsn || null,
      quantity: parseFloat(order.quantity),
      unit: order.unit,
      deadline_date: order.deadline_date,
    };

    setOrderItems([...orderItems, newItem]);
    setOrder({
      item_name: '',
      hsn: '',
      quantity: '',
      unit: '',
      deadline_date: order.deadline_date, // Keep date for convenience
    });
    Alert.alert('Success', 'Item added to list');
  };

  const handleRemoveItem = (index) => {
    const newItems = [...orderItems];
    newItems.splice(index, 1);
    setOrderItems(newItems);
  };

  const handleCreateOrder = async () => {
    if (orderItems.length === 0) {
      Alert.alert('Error', 'Please add items to the list first');
      return;
    }

    setSubmitting(true);
    try {
      await projectsAPI.createMinorOrder({
        company_id: user.company_id,
        items: orderItems,
        created_by: user.id,
      });

      Alert.alert('Success', 'Minor orders created! Vendors can now bid on them.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error creating minor order:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minor Order</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📝 Create Minor Order</Text>
          <Text style={styles.infoText}>
            Create an open order that all vendors can bid on. You'll be able to review bids and select the best vendor.
          </Text>
        </View>

        <Text style={styles.label}>Item Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter item name"
          value={order.item_name}
          onChangeText={(text) => setOrder({ ...order, item_name: text })}
        />

        <Text style={styles.label}>HSN Number (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter HSN number"
          value={order.hsn}
          onChangeText={(text) => setOrder({ ...order, hsn: text })}
        />

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Quantity *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter quantity"
              value={order.quantity}
              onChangeText={(text) => setOrder({ ...order, quantity: text })}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Unit *</Text>
            <TextInput
              style={styles.input}
              placeholder="kg, pcs, etc."
              value={order.unit}
              onChangeText={(text) => setOrder({ ...order, unit: text })}
            />
          </View>
        </View>

        <Text style={styles.label}>Deadline Date *</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD (e.g., 2024-12-31)"
          value={order.deadline_date}
          onChangeText={(text) => setOrder({ ...order, deadline_date: text })}
        />
        <Text style={styles.helpText}>
          Enter the date by which you need the order to be delivered
        </Text>

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleAddToOrder}
        >
          <Text style={styles.createButtonText}>Add to List</Text>
        </TouchableOpacity>

        {/* Order List */}
        {orderItems.length > 0 && (
          <View style={styles.orderListContainer}>
            <Text style={styles.orderListTitle}>Items to Order ({orderItems.length})</Text>
            {orderItems.map((item, index) => (
              <View key={index} style={styles.orderItemCard}>
                <View style={styles.orderItemHeader}>
                  <Text style={styles.orderItemName}>{item.item_name}</Text>
                  <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.orderItemDetails}>
                  {item.quantity} {item.unit} • Deadline: {item.deadline_date}
                </Text>
                {item.hsn && <Text style={styles.orderItemDetails}>HSN: {item.hsn}</Text>}
              </View>
            ))}

            <TouchableOpacity
              style={styles.submitOrderButton}
              onPress={handleCreateOrder}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitOrderButtonText}>Create All Orders</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FF9500',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 5,
  },
  backText: {
    color: 'white',
    fontSize: 16,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  createButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  orderListContainer: {
    marginTop: 10,
    marginBottom: 30,
  },
  orderListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  orderItemCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  removeText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  orderItemDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  submitOrderButton: {
    backgroundColor: '#FF9500',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitOrderButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});








