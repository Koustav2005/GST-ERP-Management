import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { projectsAPI } from '../config/api';

// Captcha Component
const CaptchaComponent = ({ onVerify, visible }) => {
  const [captchaValue, setCaptchaValue] = useState('');
  const [captchaCode] = useState(() => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    return { num1, num2, answer: num1 + num2 };
  });

  const handleVerify = () => {
    if (parseInt(captchaValue) === captchaCode.answer) {
      onVerify(true);
      setCaptchaValue('');
    } else {
      Alert.alert('Error', 'Incorrect captcha. Please try again.');
      setCaptchaValue('');
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.captchaOverlay}>
        <View style={styles.captchaModal}>
          <Text style={styles.captchaTitle}>Verify Order</Text>
          <Text style={styles.captchaQuestion}>
            What is {captchaCode.num1} + {captchaCode.num2}?
          </Text>
          <TextInput
            style={styles.captchaInput}
            placeholder="Enter answer"
            value={captchaValue}
            onChangeText={setCaptchaValue}
            keyboardType="numeric"
            autoFocus
          />
          <View style={styles.captchaButtons}>
            <TouchableOpacity
              style={[styles.captchaButton, styles.captchaButtonCancel]}
              onPress={() => onVerify(false)}
            >
              <Text style={styles.captchaButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.captchaButton, styles.captchaButtonVerify]}
              onPress={handleVerify}
            >
              <Text style={styles.captchaButtonText}>Verify</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function MinorOrderBidsManagementScreen({ route, navigation }) {
  const { orderId, user } = route.params;
  const [order, setOrder] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBid, setSelectedBid] = useState(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, []);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await projectsAPI.getMinorOrderBids(orderId);
      setOrder(response.data.order);
      setBids(response.data.bids || []);
    } catch (error) {
      console.error('Error fetching order:', error);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVendor = (bid) => {
    setSelectedBid(bid);
    setShowCaptcha(true);
  };

  const handleCaptchaVerify = async (verified) => {
    setShowCaptcha(false);
    
    if (!verified || !selectedBid) return;

    setPlacingOrder(true);
    try {
      // First select the vendor
      await projectsAPI.selectMinorOrderVendor(orderId, selectedBid.id);
      
      // Then create the major order
      await projectsAPI.createMajorOrder({
        company_id: user.company_id,
        vendor_id: selectedBid.vendor_id,
        item_name: order.item_name,
        hsn: order.hsn || null,
        quantity: order.quantity,
        unit: order.unit,
        unit_price: selectedBid.unit_price,
        total_price: selectedBid.total_price,
        expected_delivery_date: order.deadline_date,
        created_by: user.id,
      });

      Alert.alert('Success', 'Order placed successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to place order');
    } finally {
      setPlacingOrder(false);
      setSelectedBid(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Bids</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9500" />
          <Text style={styles.loadingText}>Loading bids...</Text>
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
          <Text style={styles.headerTitle}>Order Bids</Text>
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
        <Text style={styles.headerTitle}>Order Bids</Text>
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
          <Text style={styles.deadline}>
            Deadline: {new Date(order.deadline_date).toLocaleDateString()}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: order.status === 'open' ? '#34C759' : '#007AFF' }]}>
            <Text style={styles.statusText}>{order.status}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Bids ({bids.length})</Text>
        
        {bids.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No bids received yet</Text>
            <Text style={styles.emptySubtext}>Vendors can bid on this order</Text>
          </View>
        ) : (
          bids.map((bid) => (
            <View key={bid.id} style={styles.bidCard}>
              <View style={styles.bidHeader}>
                <View>
                  <Text style={styles.bidVendor}>{bid.vendor_name || 'Vendor'}</Text>
                  <Text style={styles.bidEmail}>{bid.vendor_email}</Text>
                </View>
                <View style={[styles.bidStatusBadge, { backgroundColor: bid.status === 'accepted' ? '#34C759' : bid.status === 'rejected' ? '#FF3B30' : '#FF9500' }]}>
                  <Text style={styles.bidStatusText}>{bid.status}</Text>
                </View>
              </View>
              <View style={styles.bidDetails}>
                <Text style={styles.bidDetailText}>
                  Unit Price: ₹{bid.unit_price}
                </Text>
                <Text style={styles.bidDetailText}>
                  Total Price: ₹{bid.total_price}
                </Text>
              </View>
              {/* Show Place Order button for pending bids or accepted bids when order is awarded */}
              {(bid.status === 'pending' || (order.status === 'awarded' && bid.status === 'accepted')) && (
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => handleSelectVendor(bid)}
                  disabled={placingOrder}
                >
                  {placingOrder ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.selectButtonText}>Place Order</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <CaptchaComponent
        visible={showCaptcha}
        onVerify={handleCaptchaVerify}
      />
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
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginTop: 10,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  emptyContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  bidCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bidVendor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  bidEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  bidStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  bidStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  bidDetails: {
    marginTop: 10,
  },
  bidDetailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  selectButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  selectButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  placedBadge: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  placedText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  captchaOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  captchaModal: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    width: '100%',
    maxWidth: 400,
  },
  captchaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  captchaQuestion: {
    fontSize: 18,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  captchaInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  captchaButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  captchaButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  captchaButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  captchaButtonVerify: {
    backgroundColor: '#FF9500',
  },
  captchaButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

