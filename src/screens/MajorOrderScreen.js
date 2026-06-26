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
  Modal,
} from 'react-native';
import { projectsAPI } from '../config/api';

// Simple captcha component
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
      onRequestClose={() => { }}
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

export default function MajorOrderScreen({ route, navigation }) {
  const { user } = route.params;
  const [searchTerm, setSearchTerm] = useState('');
  const [allMaterials, setAllMaterials] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [orderItems, setOrderItems] = useState([]);

  useEffect(() => {
    fetchAllMaterials();
  }, []);

  const fetchAllMaterials = async () => {
    setLoading(true);
    try {
      const response = await projectsAPI.getMaterialsDetail(user.company_id);
      setAllMaterials(response.data || []);
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
      Alert.alert('Error', 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setSearchResults(allMaterials);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = allMaterials.filter(material =>
      material.item_name.toLowerCase().includes(term) ||
      (material.hsn && material.hsn.includes(term))
    );

    setSearchResults(filtered);
  };

  const handleSelectMaterial = (material) => {
    setSelectedMaterial(material);
    setSearchResults([]);
    setSearchTerm('');
  };

  const handleAddToOrder = () => {
    if (!selectedMaterial) {
      Alert.alert('Error', 'Please select a material');
      return;
    }

    if (!quantity || parseFloat(quantity) <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    const orderQuantity = parseFloat(quantity);
    const totalPrice = orderQuantity * parseFloat(selectedMaterial.unit_price);

    const newItem = {
      materials_detail_id: selectedMaterial.id,
      vendor_id: selectedMaterial.vendor_id,
      item_name: selectedMaterial.item_name,
      hsn: selectedMaterial.hsn,
      quantity: orderQuantity,
      unit: selectedMaterial.unit,
      unit_price: selectedMaterial.unit_price,
      total_price: totalPrice,
      vendor_name: selectedMaterial.vendor_name, // For display
    };

    setOrderItems([...orderItems, newItem]);
    setSelectedMaterial(null);
    setQuantity('');
    Alert.alert('Success', 'Item added to list');
  };

  const handleRemoveItem = (index) => {
    const newItems = [...orderItems];
    newItems.splice(index, 1);
    setOrderItems(newItems);
  };

  const handlePlaceOrder = () => {
    if (orderItems.length === 0) {
      Alert.alert('Error', 'Please add items to the list first');
      return;
    }
    setShowCaptcha(true);
  };

  const handleCaptchaVerify = async (verified) => {
    setShowCaptcha(false);

    if (!verified) return;

    setSubmitting(true);
    try {
      await projectsAPI.createMajorOrder({
        company_id: user.company_id,
        items: orderItems,
        created_by: user.id,
      });

      Alert.alert('Success', 'All orders placed successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to place order');
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
        <Text style={styles.headerTitle}>Major Order</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📋 Place Major Order</Text>
          <Text style={styles.infoText}>
            Search for items from your saved materials. Order will be placed with the contracted vendor.
          </Text>
        </View>

        <Text style={styles.label}>Search by Item Name or HSN *</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Enter item name or HSN number"
            value={searchTerm}
            onChangeText={(text) => {
              setSearchTerm(text);
              if (!text.trim()) {
                setSearchResults(allMaterials);
              }
            }}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        {searchResults.length > 0 ? (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Available Materials:</Text>
            {searchResults.map((material) => (
              <TouchableOpacity
                key={material.id}
                style={styles.resultCard}
                onPress={() => handleSelectMaterial(material)}
              >
                <Text style={styles.resultItemName}>{material.item_name}</Text>
                <Text style={styles.resultDetails}>
                  HSN: {material.hsn || 'N/A'} • Unit: {material.unit} • Price: ₹{material.unit_price}
                </Text>
                <Text style={styles.resultVendor}>Vendor: {material.vendor_name || 'N/A'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No materials found</Text>
            </View>
          )
        )}

        {selectedMaterial && (
          <View style={styles.selectedContainer}>
            <Text style={styles.selectedTitle}>Selected Material:</Text>
            <View style={styles.selectedCard}>
              <Text style={styles.selectedItemName}>{selectedMaterial.item_name}</Text>
              <Text style={styles.selectedDetails}>
                HSN: {selectedMaterial.hsn || 'N/A'}
              </Text>
              <Text style={styles.selectedDetails}>
                Unit: {selectedMaterial.unit} • Unit Price: ₹{selectedMaterial.unit_price}
              </Text>
              <Text style={styles.selectedDetails}>
                Vendor: {selectedMaterial.vendor_name || 'N/A'}
              </Text>
              <Text style={styles.selectedDetails}>
                Supply Until: {new Date(selectedMaterial.supply_until_date).toLocaleDateString()}
              </Text>

              <Text style={styles.label}>Quantity to Order *</Text>
              <TextInput
                style={styles.input}
                placeholder={`Enter quantity in ${selectedMaterial.unit}`}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />

              {quantity && parseFloat(quantity) > 0 && (
                <View style={styles.totalContainer}>
                  <Text style={styles.totalLabel}>Total Amount:</Text>
                  <Text style={styles.totalValue}>
                    ₹{(parseFloat(quantity) * parseFloat(selectedMaterial.unit_price)).toFixed(2)}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.placeOrderButton}
                onPress={handleAddToOrder}
              >
                <Text style={styles.placeOrderButtonText}>Add to List</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => {
                  setSelectedMaterial(null);
                  setQuantity('');
                }}
              >
                <Text style={styles.changeButtonText}>Cancel Selection</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
                  {item.quantity} {item.unit} x ₹{item.unit_price} = ₹{item.total_price.toFixed(2)}
                </Text>
                <Text style={styles.orderItemVendor}>Vendor: {item.vendor_name}</Text>
              </View>
            ))}

            <View style={styles.grandTotalContainer}>
              <Text style={styles.grandTotalLabel}>Grand Total:</Text>
              <Text style={styles.grandTotalValue}>
                ₹{orderItems.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.submitOrderButton}
              onPress={handlePlaceOrder}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitOrderButtonText}>Place All Orders</Text>
              )}
            </TouchableOpacity>
          </View>
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
  searchContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  searchButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    marginBottom: 15,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  resultCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  resultItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  resultDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  resultVendor: {
    fontSize: 13,
    color: '#999',
    marginTop: 5,
  },
  selectedContainer: {
    marginTop: 20,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  selectedCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  selectedItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  selectedDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9500',
  },
  placeOrderButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  placeOrderButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  changeButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  changeButtonText: {
    color: '#666',
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
  orderListContainer: {
    marginTop: 20,
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
  orderItemVendor: {
    fontSize: 12,
    color: '#999',
  },
  grandTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 15,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9500',
  },
  submitOrderButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitOrderButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});



