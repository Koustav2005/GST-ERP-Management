import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { projectsAPI, purchaseOrdersAPI } from '../config/api';
import Footer from '../components/Footer';

export default function InStockOrdersScreen({ route, navigation }) {
  const { user } = route.params;
  const [orders, setOrders] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [poModalVisible, setPOModalVisible] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  // Bill image upload state
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [billImages, setBillImages] = useState([]); // [{uri, caption}]
  const [billOrderId, setBillOrderId] = useState(null);
  const [savedBills, setSavedBills] = useState({}); // { orderId: [{uri, caption}] }
  const [activeTab, setActiveTab] = useState('new'); // new, partial, complete

  useEffect(() => {
    fetchOrders();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, [])
  );

  const fetchOrders = async () => {
    try {
      setLoading(true);
      if (!user.company_id) {
        console.error('Company ID is missing');
        return;
      }
      const [ordersResponse, receiptsResponse, poResponse] = await Promise.all([
        projectsAPI.getMajorOrders(user.company_id),
        projectsAPI.getOrderReceipts(user.company_id),
        purchaseOrdersAPI.getByCompany(user.company_id)
      ]);
      setOrders(ordersResponse.data.orders || []);
      setReceipts(receiptsResponse.data.receipts || []);
      setPurchaseOrders(poResponse.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (error.message === 'Network Error') {
        console.error('Network Error: Please check if the backend server is running');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleViewOrder = (order) => {
    // Check if receipt already exists for this order/PO
    const receipt = receipts.find(r =>
      (order.order_type === 'legacy' && r.order_id === order.id) ||
      (order.order_type === 'purchase_order' && r.purchase_order_id === order.purchase_order_id)
    );
    if (receipt) {
      // If receipt exists, navigate to barcode screen instead
      navigation.navigate('BarcodeGeneration', {
        item: { item_name: order.item_name, hsn: order.hsn },
        order: order,
        user: user
      });
    } else {
      // If no receipt, navigate to receipt screen
      navigation.navigate('OrderReceipt', { order, user });
    }
  };

  const handleViewPO = async (poId) => {
    try {
      const response = await purchaseOrdersAPI.getById(poId);
      setSelectedPO(response.data);
      setPOModalVisible(true);
    } catch (error) {
      console.error('Error fetching PO details:', error);
    }
  };

  // Bill image functions
  const openBillUpload = (order) => {
    const key = order.purchase_order_id || order.id;
    setBillOrderId(key);
    setBillImages(savedBills[key] || []);
    setBillModalVisible(true);
  };

  const pickBillImage = async (source) => {
    let result;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Needed', 'Camera access is required.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, quality: 0.8 });
    }
    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(a => ({ uri: a.uri, caption: '' }));
      setBillImages(prev => [...prev, ...newImages]);
    }
  };

  const updateBillCaption = (index, text) => {
    setBillImages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], caption: text };
      return updated;
    });
  };

  const removeBillImage = (index) => {
    setBillImages(prev => prev.filter((_, i) => i !== index));
  };

  const saveBillImages = () => {
    if (billImages.length === 0) {
      Alert.alert('No Images', 'Please add at least one bill image.');
      return;
    }
    setSavedBills(prev => ({ ...prev, [billOrderId]: billImages }));
    setBillModalVisible(false);
    Alert.alert('Saved', `${billImages.length} bill image(s) saved for this order.`);
  };

  const getOrderStatus = (order, receiptStatus) => {
    if (receiptStatus === 'complete') {
      return { status: 'Updated to Accounts', color: '#34C759' };
    }
    if (receiptStatus === 'partial') {
      return { status: 'Partially Received', color: '#FF9500' };
    }
    // Otherwise use the order's original status
    return { status: order.status, color: getStatusColor(order.status) };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'confirmed': return '#007AFF';
      case 'shipped': return '#5856D6';
      case 'dispatched': return '#AF52DE';
      case 'delivered': return '#34C759';
      case 'cancelled': return '#FF3B30';
      case 'Updated to Accounts': return '#34C759';
      default: return '#8E8E93';
    }
  };
  const getStatusLabel = (status) => {
    switch (status) {
      case 'confirmed': return 'Order Placed';
      case 'shipped': return 'Shipped';
      case 'dispatched': return 'Dispatched';
      case 'delivered': return 'Delivered';
      case 'pending': return 'Pending';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const formatPONumber = (companyName, poId, sequentialNumber) => {
    const getInitials = (name) => {
      if (!name) return 'PO';
      const words = name.trim().split(/\s+/);
      if (words.length === 1) return words[0].substring(0, 5).toUpperCase();
      return words.map(w => w[0]).join('').substring(0, 5).toUpperCase();
    };
    const prefix = getInitials(companyName);
    const displayId = sequentialNumber || poId;
    const idStr = String(displayId || '').padStart(9, '0');
    return `${prefix}${idStr}`;
  };

  // Render order card helper
  const renderOrderCard = (displayOrder, category) => {
    const orderId = displayOrder.purchase_order_id || displayOrder.id;
    const orderReceipts = receipts.filter(r =>
      (displayOrder.order_type === 'legacy' && r.order_id === displayOrder.id) ||
      (displayOrder.order_type === 'purchase_order' && r.purchase_order_id === displayOrder.purchase_order_id)
    );
    
    const latestReceipt = orderReceipts.length > 0 ? orderReceipts[0] : null;
    const receiptStatus = latestReceipt?.receipt_status || (latestReceipt ? 'complete' : null);
    
    const orderStatusStr = category === 'pending' ? 'pending' : category;
    const orderStatus = getOrderStatus(displayOrder, orderStatusStr);
    const uniqueKey = `${displayOrder.order_type}_${orderId}`;

    return (
      <View
        key={uniqueKey}
        style={[
          styles.orderCard,
          category === 'complete' && styles.orderCardSubmitted,
          category === 'partial' && styles.orderCardPartial,
        ]}
      >
        <View style={styles.orderHeader}>
          <Text style={styles.orderItemName}>{formatPONumber(displayOrder.company_name, orderId, displayOrder.po_number_sequential)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: orderStatus.color }]}>
            <Text style={styles.statusText}>{orderStatus.status}</Text>
          </View>
        </View>
        
        <View style={styles.itemsList}>
          {displayOrder.items.map((item, idx) => {
            const qtyOrdered = parseFloat(item.quantity) || 0;
            const qtyReceived = parseFloat(item.total_received) || 0;
            const qtyRemaining = Math.max(0, qtyOrdered - qtyReceived);

            return (
              <View key={idx} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemNameText}>{item.item_name}</Text>
                  <View style={styles.qtyRow}>
                    <Text style={styles.itemQtyText}>Ordered: {qtyOrdered}</Text>
                    <Text style={[styles.itemQtyText, { color: '#34C759' }]}> Rec: {qtyReceived}</Text>
                    {qtyRemaining > 0 && (
                      <Text style={[styles.itemQtyText, { color: '#FF3B30', fontWeight: 'bold' }]}> Rem: {qtyRemaining.toFixed(2)}</Text>
                    )}
                  </View>
                </View>
                {category === 'complete' && (
                  <TouchableOpacity
                    style={styles.actionButtonSmall}
                    onPress={() => handleViewOrder(item)}
                  >
                    <Text style={styles.actionButtonSmallText}>Barcode</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.orderFooter}>
          <View style={{ flex: 1 }}>
            <Text style={styles.vendorNameText}>{displayOrder.vendor_name}</Text>
            <Text style={styles.orderDateText}>
              {displayOrder.order_date ? new Date(displayOrder.order_date).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
          {category !== 'complete' && (
            <TouchableOpacity
              style={styles.billButtonMain}
              onPress={() => navigation.navigate('OrderReceipt', { order: displayOrder, user })}
            >
              <Text style={styles.billButtonMainText}>📤 Submit to Accounts</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>In Stock</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5856D6" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
        <Footer />
      </View>
    );
  }
  return (
    <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>In Stock</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'new' && styles.activeTab]}
            onPress={() => setActiveTab('new')}
          >
            <Text style={[styles.tabText, activeTab === 'new' && styles.activeTabText]}>New</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'partial' && styles.activeTab]}
            onPress={() => setActiveTab('partial')}
          >
            <Text style={[styles.tabText, activeTab === 'partial' && styles.activeTabText]}>Partial</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'complete' && styles.activeTab]}
            onPress={() => setActiveTab('complete')}
          >
            <Text style={[styles.tabText, activeTab === 'complete' && styles.activeTabText]}>Complete</Text>
          </TouchableOpacity>
        </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {orders.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No orders available</Text>
            <Text style={styles.emptySubtext}>Orders placed by accounts will appear here</Text>
          </View>
        ) : (
          <View style={{ paddingBottom: 20 }}>
            {(() => {
              // Grouping logic
              const groupedMap = orders.reduce((acc, order) => {
                const key = order.purchase_order_id || `legacy-${order.id}`;
                if (!acc[key]) {
                  acc[key] = {
                    ...order,
                    items: []
                  };
                }
                acc[key].items.push(order);
                return acc;
              }, {});

              const groupedOrders = Object.values(groupedMap);
              const pendingOrders = [];
              const partialOrders = [];
              const completedOrders = [];

              groupedOrders.forEach(group => {
                const orderReceipts = receipts.filter(r =>
                  (group.order_type === 'legacy' && r.order_id === group.id) ||
                  (group.order_type === 'purchase_order' && r.purchase_order_id === group.purchase_order_id)
                );

                if (orderReceipts.length === 0) {
                  pendingOrders.push(group);
                } else {
                  const latest = orderReceipts[0]; 
                  if (latest.receipt_status === 'complete') {
                    completedOrders.push(group);
                  } else {
                    partialOrders.push(group);
                  }
                }
              });

              if (pendingOrders.length === 0 && partialOrders.length === 0 && completedOrders.length === 0) {
                return (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>📦</Text>
                    <Text style={styles.emptyText}>No active orders</Text>
                  </View>
                );
              }

              return (
                <>
                  {activeTab === 'new' && pendingOrders.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>New Order ({pendingOrders.length})</Text>
                      {pendingOrders.map(group => renderOrderCard(group, 'pending'))}
                    </>
                  )}
                  {activeTab === 'partial' && partialOrders.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>Partial ({partialOrders.length})</Text>
                      {partialOrders.map(group => renderOrderCard(group, 'partial'))}
                    </>
                  )}
                  {activeTab === 'complete' && completedOrders.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>Complete ({completedOrders.length})</Text>
                      {completedOrders.map(group => renderOrderCard(group, 'complete'))}
                    </>
                  )}
                  {activeTab === 'new' && pendingOrders.length === 0 && (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyIcon}>🎉</Text>
                      <Text style={styles.emptyText}>No New Orders</Text>
                    </View>
                  )}
                  {activeTab === 'partial' && partialOrders.length === 0 && (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyIcon}>📦</Text>
                      <Text style={styles.emptyText}>No Partial Orders</Text>
                    </View>
                  )}
                  {activeTab === 'complete' && completedOrders.length === 0 && (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyIcon}>✅</Text>
                      <Text style={styles.emptyText}>No Completed Orders</Text>
                    </View>
                  )}
                </>
              );
            })()}
          </View>
        )}
      </ScrollView>

      <Footer />

      {/* PO Details Modal */}
      <Modal
        visible={poModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPOModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPO && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Purchase Order Details</Text>
                  <TouchableOpacity onPress={() => setPOModalVisible(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Vendor:</Text>
                    <Text style={styles.modalInfoValue}>{selectedPO.vendor_name}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Email:</Text>
                    <Text style={styles.modalInfoValue}>{selectedPO.vendor_email || 'N/A'}</Text>
                  </View>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Date:</Text>
                    <Text style={styles.modalInfoValue}>{new Date(selectedPO.created_at).toLocaleString()}</Text>
                  </View>

                  <Text style={styles.modalSectionTitle}>Items</Text>
                  {selectedPO.items?.map((item, index) => (
                    <View key={index} style={styles.modalItemCard2}>
                      <Text style={styles.modalItemName}>{item.material_name}</Text>
                      <Text style={styles.modalItemText}>HSN: {item.hsn || 'N/A'}</Text>
                      <Text style={styles.modalItemText}>
                        Quantity: {item.quantity} {item.unit}
                      </Text>
                      <Text style={styles.modalItemText}>
                        Unit Price: ₹{item.unit_price} (+{item.gst_rate || 0}% GST)
                      </Text>
                      <Text style={styles.modalItemText}>
                        Subtotal: ₹{parseFloat(item.total_price).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.modalSummary}>
                    <Text style={styles.modalSummaryTotal}>
                      Grand Total: ₹{selectedPO.total_amount}
                    </Text>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Bill Image Upload Modal */}
      <Modal
        visible={billModalVisible}
        animationType="slide"
        onRequestClose={() => setBillModalVisible(false)}
      >
        <View style={styles.billModalContainer}>
          <View style={styles.billModalHeader}>
            <TouchableOpacity onPress={() => setBillModalVisible(false)}>
              <Text style={styles.billModalBack}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.billModalTitle}>Upload Bill Images</Text>
            <TouchableOpacity onPress={saveBillImages}>
              <Text style={styles.billModalSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.billModalBody}>
            {/* Pick Image Buttons */}
            <View style={styles.billPickRow}>
              <TouchableOpacity style={styles.billPickBtn} onPress={() => pickBillImage('camera')}>
                <Text style={styles.billPickBtnText}>📷 Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.billPickBtn} onPress={() => pickBillImage('gallery')}>
                <Text style={styles.billPickBtnText}>🖼️ Gallery</Text>
              </TouchableOpacity>
            </View>

            {billImages.length === 0 && (
              <View style={styles.billEmptyState}>
                <Text style={styles.billEmptyIcon}>📄</Text>
                <Text style={styles.billEmptyText}>No bill images added yet</Text>
                <Text style={styles.billEmptySubtext}>Tap Camera or Gallery to add bill photos</Text>
              </View>
            )}

            {billImages.map((img, index) => (
              <View key={index} style={styles.billImageCard}>
                <View style={styles.billImageRow}>
                  <Image source={{ uri: img.uri }} style={styles.billImagePreview} />
                  <View style={styles.billImageInfo}>
                    <Text style={styles.billImageLabel}>Image {index + 1}</Text>
                    <TextInput
                      style={styles.billCaptionInput}
                      placeholder="Add caption (e.g. Invoice #123)"
                      value={img.caption}
                      onChangeText={(text) => updateBillCaption(index, text)}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.billImageDeleteBtn}
                    onPress={() => removeBillImage(index)}
                  >
                    <Text style={styles.billImageDeleteText}>❌</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#5856D6',
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 10,
    marginHorizontal: 15,
    marginTop: -10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#5856D6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  emptyContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 40,
    alignItems: 'center',
    marginTop: 50,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
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
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#5856D6',
  },
  orderCardSubmitted: {
    borderLeftColor: '#34C759',
  },
  orderCardPartial: {
    borderLeftColor: '#FF9500',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderDetails: {
    marginTop: 10,
  },
  orderDetailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    lineHeight: 20,
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  updateButton: {
    backgroundColor: '#007AFF',
    marginRight: 10,
  },
  receiptButton: {
    backgroundColor: '#34C759',
  },
  partialButton: {
    backgroundColor: '#FF9500',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  updatedText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  statusOptions: {
    gap: 12,
  },
  statusOption: {
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusOptionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelOption: {
    backgroundColor: '#f0f0f0',
    marginTop: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  closeButton: {
    fontSize: 24,
    color: '#999',
    fontWeight: 'bold',
  },
  modalBody: {
    maxHeight: 400,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalInfoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  modalInfoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  modalItemCard2: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#5856D6',
  },
  modalItemText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 3,
  },
  modalSummary: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modalSummaryTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9500',
    textAlign: 'right',
  },
  // Bill upload styles
  billUploadBtn: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#5856D6',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  billUploadBtnText: {
    color: '#5856D6',
    fontSize: 14,
    fontWeight: '700',
  },
  billModalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  billModalHeader: {
    backgroundColor: '#5856D6',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billModalBack: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  billModalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  billModalSave: {
    color: '#FFD60A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  billModalBody: {
    padding: 15,
  },
  billPickRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  billPickBtn: {
    flex: 1,
    backgroundColor: 'white',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  billPickBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  billEmptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  billEmptyIcon: {
    fontSize: 60,
    marginBottom: 10,
  },
  billEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  billEmptySubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  billImageCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  billImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billImagePreview: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  billImageInfo: {
    flex: 1,
    marginLeft: 12,
  },
  billImageLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5856D6',
    marginBottom: 6,
  },
  billCaptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  billImageDeleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
  billImageDeleteText: {
    fontSize: 18,
  },
  // ── New Styles for Grouping ───────────────────────────────────────────
  itemsList: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 8,
  },
  itemNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  qtyRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  itemQtyText: {
    fontSize: 12,
    color: '#666',
  },
  actionButtonSmall: {
    backgroundColor: '#5856D6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonSmallText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  vendorNameText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  orderDateText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  billButtonMain: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#5856D6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  billButtonMainText: {
    color: '#5856D6',
    fontSize: 13,
    fontWeight: 'bold',
  },
});

