import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { projectsAPI } from '../config/api';

export default function MinorOrderBidScreen({ route, navigation }) {
  const { orderId, user } = route.params;
  const [order, setOrder] = useState(null);
  const [minimumBids, setMinimumBids] = useState(null);
  const [bid, setBid] = useState({
    unit_price: '',
    total_price: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, []);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const [orderResponse, minBidsResponse] = await Promise.all([
        projectsAPI.getMinorOrder(orderId),
        projectsAPI.getMinorOrderMinimumBids(orderId),
      ]);

      setOrder(orderResponse.data.order);
      setMinimumBids(minBidsResponse.data.minimum_bids);

      // Check if vendor already bid
      const existingBid = orderResponse.data.bids.find(b => b.vendor_id === user.id);
      if (existingBid) {
        setBid({
          unit_price: existingBid.unit_price.toString(),
          total_price: existingBid.total_price.toString(),
        });
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleBidChange = (field, value) => {
    setBid({ ...bid, [field]: value });

    if (field === 'unit_price' && order) {
      const unitPrice = parseFloat(value) || 0;
      const totalPrice = unitPrice * parseFloat(order.quantity);
      setBid({ ...bid, unit_price: value, total_price: totalPrice.toFixed(2) });
    }
  };

  const handleSubmitBid = async () => {
    if (!bid.unit_price || parseFloat(bid.unit_price) <= 0) {
      Alert.alert('Error', 'Please enter a valid unit price');
      return;
    }

    setSubmitting(true);
    try {
      await projectsAPI.submitMinorOrderBid(orderId, {
        vendor_id: user.id,
        unit_price: parseFloat(bid.unit_price),
        total_price: parseFloat(bid.total_price),
      });

      Alert.alert('Success', 'Bid submitted successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error submitting bid:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit bid');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Place Bid</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9C27B0" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Place Bid</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Order not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Place Bid</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderTitle}>{order.item_name}</Text>
          <Text style={styles.orderDetails}>
            Quantity: {order.quantity} {order.unit}
          </Text>
          {order.hsn && (
            <Text style={styles.orderDetails}>HSN: {order.hsn}</Text>
          )}
          {order.company_name && (
            <Text style={styles.orderDetails}>Company: {order.company_name}</Text>
          )}
          <Text style={styles.deadline}>
            Deadline: {new Date(order.deadline_date).toLocaleDateString()}
          </Text>
        </View>

        {minimumBids?.min_unit_price && (
          <View style={styles.minBidInfo}>
            <Text style={styles.minBidLabel}>💰 Lowest Bid:</Text>
            <Text style={styles.minBidValue}>
              ₹{parseFloat(minimumBids.min_unit_price).toFixed(2)} per unit
            </Text>
            <Text style={styles.minBidNote}>
              (Other vendors' bids - bidder details not shown)
            </Text>
          </View>
        )}

        <Text style={styles.label}>Your Unit Price (₹) *</Text>
        <TextInput
          style={styles.input}
          placeholder={minimumBids?.min_unit_price ? `Min: ₹${parseFloat(minimumBids.min_unit_price).toFixed(2)}` : "0.00"}
          value={bid.unit_price}
          onChangeText={(text) => handleBidChange('unit_price', text)}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Total Price (₹)</Text>
        <TextInput
          style={[styles.input, styles.totalInput]}
          value={bid.total_price}
          editable={false}
          placeholder="Auto-calculated"
        />

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmitBid}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Bid</Text>
          )}
        </TouchableOpacity>
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
    backgroundColor: '#9C27B0',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  orderInfo: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  orderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  orderDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  deadline: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
    marginTop: 5,
  },
  minBidInfo: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  minBidLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 5,
  },
  minBidValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 5,
  },
  minBidNote: {
    fontSize: 11,
    color: '#856404',
    fontStyle: 'italic',
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
  totalInput: {
    backgroundColor: '#f0f0f0',
  },
  submitButton: {
    backgroundColor: '#9C27B0',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});








