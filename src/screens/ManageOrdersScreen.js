import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { projectsAPI, purchaseOrdersAPI } from '../config/api';
import { getApiUrl } from '../config/api';
import Footer from '../components/Footer';

export default function ManageOrdersScreen({ route, navigation }) {
  const { user } = route.params;
  const [orders, setOrders] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedPO, setSelectedPO] = useState(null);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [poModalVisible, setPOModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'partial', 'complete'
  const [editableAmounts, setEditableAmounts] = useState([]); // [{item_name, unit_price, gst_rate}]
  const [savingAmounts, setSavingAmounts] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
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
      console.error('Error fetching data:', error);
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
    fetchData();
  };

  const handleViewReceipt = async (receiptId) => {
    try {
      const response = await projectsAPI.getOrderReceipt(receiptId);
      setSelectedReceipt(response.data);
      // Pre-populate editable amounts from existing values
      const items = response.data.items || [];
      setEditableAmounts(items.map(item => ({
        item_name: item.item_name,
        unit_price: item.unit_price ? String(item.unit_price) : '',
        gst_rate: item.gst_rate ? String(item.gst_rate) : '',
      })));
      setReceiptModalVisible(true);
    } catch (error) {
      console.error('Error fetching receipt:', error);
    }
  };

  const handleApproveReceipt = async (receiptId) => {
    try {
      await projectsAPI.updateReceiptStatus(receiptId, 'approved', user.id);
      fetchData();
      setReceiptModalVisible(false);
    } catch (error) {
      console.error('Error approving receipt:', error);
    }
  };

  const handleSaveAmounts = async () => {
    if (!selectedReceipt?.receipt?.id) return;
    // Validate at least one item has unit_price
    const hasPrice = editableAmounts.some(a => parseFloat(a.unit_price) > 0);
    if (!hasPrice) {
      Alert.alert('Validation', 'Please enter the unit price for at least one item.');
      return;
    }
    setSavingAmounts(true);
    try {
      const items = editableAmounts.map(a => ({
        item_name: a.item_name,
        unit_price: parseFloat(a.unit_price) || 0,
        gst_rate: parseFloat(a.gst_rate) || 0,
      }));
      await projectsAPI.updateReceiptAmounts(selectedReceipt.receipt.id, { items });
      Alert.alert('Saved', 'Amounts have been saved successfully.');
      // Refresh receipt data
      const response = await projectsAPI.getOrderReceipt(selectedReceipt.receipt.id);
      setSelectedReceipt(response.data);
    } catch (error) {
      console.error('Error saving amounts:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save amounts');
    } finally {
      setSavingAmounts(false);
    }
  };

  const handleRejectReceipt = async (receiptId) => {
    try {
      await projectsAPI.updateReceiptStatus(receiptId, 'rejected', user.id);
      fetchData();
      setReceiptModalVisible(false);
    } catch (error) {
      console.error('Error rejecting receipt:', error);
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

  const handleStatusUpdate = async (newStatus) => {
    if (!selectedOrder) return;

    setUpdatingStatus(true);
    try {
      if (selectedOrder.order_type === 'legacy' || !selectedOrder.order_type) {
        await projectsAPI.updateOrderStatus(selectedOrder.id, newStatus);
      } else {
        await purchaseOrdersAPI.updateStatus(selectedOrder.purchase_order_id, newStatus);
      }

      Alert.alert('Success', `Status updated to ${getStatusLabel(newStatus)}`);
      setStatusModalVisible(false);
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'sent': return '#007AFF';
      case 'confirmed': return '#34C759';
      case 'received': return '#28A745';
      case 'approved': return '#34C759';
      case 'rejected': return '#FF3B30';
      case 'cancelled': return '#FF3B30';
      default: return '#8E8E93';
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
    // Use the sequential number if available (e.g. 1 -> 001), otherwise fallback to the primary ID
    const displayId = sequentialNumber || poId;
    const idStr = String(displayId || '').padStart(9, '0');
    return `${prefix}${idStr}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Orders</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9500" />
          <Text style={styles.loadingText}>Loading...</Text>
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
        <Text style={styles.headerTitle}>Manage Orders</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Tabs for filtering by receipt status */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>All Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'partial' && styles.tabActive, activeTab === 'partial' && { backgroundColor: '#FF9500' }]}
            onPress={() => setActiveTab('partial')}
          >
            <Text style={[styles.tabText, activeTab === 'partial' && styles.tabTextActive]}>Partial</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'complete' && styles.tabActive, activeTab === 'complete' && { backgroundColor: '#34C759' }]}
            onPress={() => setActiveTab('complete')}
          >
            <Text style={[styles.tabText, activeTab === 'complete' && styles.tabTextActive]}>Completed</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Placed Orders ({(() => {
          const uniquePOs = new Set(orders.map(o => o.purchase_order_id || `legacy-${o.id}`));
          return uniquePOs.size;
        })()})</Text>
        {(() => {
          // Grouping logic inside the render
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

          return Object.values(groupedMap).map((displayOrder) => {
            const orderId = displayOrder.purchase_order_id || displayOrder.id;
            const orderReceipts = receipts.filter(r =>
              (displayOrder.order_type === 'legacy' && r.order_id === displayOrder.id) ||
              (displayOrder.order_type === 'purchase_order' && r.purchase_order_id === displayOrder.purchase_order_id)
            );
            
            // Use the most recent receipt for status
            const latestReceipt = orderReceipts.length > 0 ? orderReceipts[orderReceipts.length - 1] : null;
            const receiptStatus = latestReceipt?.receipt_status || (latestReceipt ? 'complete' : null);

            // Filter based on active tab
            if (activeTab === 'partial' && receiptStatus !== 'partial') return null;
            if (activeTab === 'complete' && receiptStatus !== 'complete') return null;

            return (
              <View key={orderId} style={[
                styles.orderCard,
                receiptStatus === 'partial' && styles.orderCardPartial,
                receiptStatus === 'complete' && styles.orderCardComplete,
              ]}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderItemName}>
                    {formatPONumber(displayOrder.company_name, orderId, displayOrder.po_number_sequential)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: displayOrder.status === 'delivered' ? '#34C759' : '#FF9500' }]}>
                    <Text style={styles.statusText}>{displayOrder.status}</Text>
                  </View>
                </View>

                {/* Receipt status badge */}
                {receiptStatus && (
                  <View style={[
                    styles.receiptStatusBadge,
                    receiptStatus === 'complete' ? styles.receiptStatusComplete : styles.receiptStatusPartial
                  ]}>
                    <Text style={styles.receiptStatusText}>
                      {receiptStatus === 'complete' ? '✅ Fully Received' : '🕐 Partially Received'}
                    </Text>
                  </View>
                )}

                {/* Display items inside the tile */}
                <View style={styles.itemsList}>
                  {displayOrder.items.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemNameText}>{item.item_name}</Text>
                        <Text style={styles.itemQtyText}>
                          Qty: {item.quantity} {item.unit}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Receipt buttons inside the tile */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                  {orderReceipts.map((r, idx) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[
                        { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#ddd' },
                        r.receipt_status === 'partial' ? { borderColor: '#FF9500' } : { borderColor: '#34C759' },
                      ]}
                      onPress={() => handleViewReceipt(r.id)}
                    >
                      <Text style={{ fontSize: 10, color: '#666' }}>
                        Receipt {idx + 1} {r.receipt_status === 'partial' ? '🕐' : '✅'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.orderFooter}>
                  <View style={styles.vendorContainer}>
                    <Text style={styles.vendorHeader}>Vendor</Text>
                    <Text style={styles.vendorNameText}>{displayOrder.vendor_name}</Text>
                  </View>
                  <View style={styles.dateContainer}>
                    <Text style={styles.orderDateHeader}>Date</Text>
                    <Text style={styles.orderDateText}>
                      {displayOrder.order_date ? new Date(displayOrder.order_date).toLocaleDateString() : (displayOrder.created_at ? new Date(displayOrder.created_at).toLocaleDateString() : 'N/A')}
                    </Text>
                  </View>
                </View>

                {/* Action buttons at bottom of tile */}
                <View style={styles.orderActions}>
                  <TouchableOpacity
                    style={[styles.actionButtonMain, { borderColor: '#5856D6' }]}
                    onPress={() => {
                      setSelectedOrder(displayOrder);
                      setStatusModalVisible(true);
                    }}
                  >
                    <Text style={[styles.actionButtonMainText, { color: '#5856D6' }]}>Update Order Status</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          });
        })()}
      </ScrollView>

      {/* Receipt Details Modal */}
      <Modal
        visible={receiptModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedReceipt && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Receipt Details</Text>
                  <TouchableOpacity onPress={() => setReceiptModalVisible(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalBody}>
                  {/* Receipt status banner */}
                  {selectedReceipt.receipt?.receipt_status && (
                    <View style={[
                      styles.receiptStatusBadge,
                      selectedReceipt.receipt.receipt_status === 'complete' ? styles.receiptStatusComplete : styles.receiptStatusPartial,
                      { marginBottom: 10 }
                    ]}>
                      <Text style={styles.receiptStatusText}>
                        {selectedReceipt.receipt.receipt_status === 'complete' ? '✅ Order Fully Received' : '🕐 Partially Received — More can be submitted'}
                      </Text>
                    </View>
                  )}

                  <Text style={styles.modalSectionTitle}>Bill Image</Text>
                  {selectedReceipt.receipt?.bill_image_url && (
                    <Image
                      source={{ uri: `${getApiUrl().replace('/api', '')}${selectedReceipt.receipt.bill_image_url}` }}
                      style={styles.billImage}
                      resizeMode="contain"
                    />
                  )}

                  {selectedReceipt.receipt?.gross_weight != null && (
                    <>
                      <Text style={styles.modalSectionTitle}>Vehicle Weight Details</Text>
                      <View style={styles.modalItemCard}>
                        <Text style={styles.modalItemText}>
                          Gross Weight: {selectedReceipt.receipt.gross_weight} {selectedReceipt.receipt.vehicle_weight_unit || 'kg'}
                        </Text>
                        <Text style={styles.modalItemText}>
                          Tare Weight: {selectedReceipt.receipt.tare_weight} {selectedReceipt.receipt.vehicle_weight_unit || 'kg'}
                        </Text>
                        <Text style={[styles.modalItemText, { fontWeight: 'bold', color: '#333' }]}>
                          Net Weight: {selectedReceipt.receipt.net_weight} {selectedReceipt.receipt.vehicle_weight_unit || 'kg'}
                        </Text>
                      </View>
                    </>
                  )}

                  {/* Items — Accountant fills unit price + GST */}
                  <Text style={styles.modalSectionTitle}>Items Received</Text>
                  {/* Amounts reminder */}
                  {editableAmounts.some(a => !parseFloat(a.unit_price)) && (
                    <View style={{ backgroundColor: '#FFF3CD', borderRadius: 8, padding: 10, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#FF9500' }}>
                      <Text style={{ color: '#856404', fontSize: 13, fontWeight: '600' }}>⚠️ Action Required</Text>
                      <Text style={{ color: '#856404', fontSize: 12 }}>Please enter unit price and GST rate for each item below.</Text>
                    </View>
                  )}
                  {(selectedReceipt.items || []).map((item, index) => {
                    const ea = editableAmounts[index] || {};
                    const unitPrice = parseFloat(ea.unit_price) || 0;
                    const gstRate = parseFloat(ea.gst_rate) || 0;
                    const qtyReceived = parseFloat(item.quantity_received) || 0;
                    const qtyOrdered = parseFloat(item.quantity_ordered) || 0;
                    const pendingQty = Math.max(0, qtyOrdered - qtyReceived);
                    const baseAmount = qtyReceived * unitPrice;
                    const gstAmount = (baseAmount * gstRate) / 100;
                    const totalAmount = baseAmount + gstAmount;
                    return (
                      <View key={index} style={styles.modalItemCard}>
                        <Text style={styles.modalItemName}>{item.item_name}</Text>
                        {item.hsn ? <Text style={styles.modalItemText}>HSN: {item.hsn}</Text> : null}

                        {/* Qty row */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                          <View style={{ flex: 1, marginRight: 8, backgroundColor: '#E8F5E9', borderRadius: 6, padding: 8 }}>
                            <Text style={{ fontSize: 11, color: '#555' }}>Received</Text>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#2E7D32' }}>{qtyReceived} {item.unit}</Text>
                          </View>
                          {pendingQty > 0 ? (
                            <View style={{ flex: 1, backgroundColor: '#FFF3E0', borderRadius: 6, padding: 8 }}>
                              <Text style={{ fontSize: 11, color: '#555' }}>Pending</Text>
                              <Text style={{ fontSize: 15, fontWeight: '700', color: '#E65100' }}>{pendingQty.toFixed(2)} {item.unit}</Text>
                            </View>
                          ) : (
                            <View style={{ flex: 1, backgroundColor: '#E8F5E9', borderRadius: 6, padding: 8 }}>
                              <Text style={{ fontSize: 11, color: '#555' }}>Status</Text>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#2E7D32' }}>✅ Complete</Text>
                            </View>
                          )}
                        </View>

                        {/* Accountant fields */}
                        <Text style={[styles.modalItemText, { marginTop: 10, fontWeight: '600', color: '#333' }]}>💼 Accountant Fields</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>Unit Price (₹) *</Text>
                            <TextInput
                              style={styles.amountInput}
                              placeholder="e.g. 500"
                              value={ea.unit_price}
                              onChangeText={val => {
                                const updated = [...editableAmounts];
                                if (!updated[index]) updated[index] = { item_name: item.item_name, unit_price: '', gst_rate: '' };
                                updated[index].unit_price = val;
                                setEditableAmounts(updated);
                              }}
                              keyboardType="numeric"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, color: '#666', marginBottom: 3 }}>GST Rate (%)</Text>
                            <TextInput
                              style={styles.amountInput}
                              placeholder="e.g. 18"
                              value={ea.gst_rate}
                              onChangeText={val => {
                                const updated = [...editableAmounts];
                                if (!updated[index]) updated[index] = { item_name: item.item_name, unit_price: '', gst_rate: '' };
                                updated[index].gst_rate = val;
                                setEditableAmounts(updated);
                              }}
                              keyboardType="numeric"
                            />
                          </View>
                        </View>

                        {/* Auto-calculated preview */}
                        {unitPrice > 0 && (
                          <View style={{ backgroundColor: '#F0F4FF', borderRadius: 6, padding: 8, marginTop: 8 }}>
                            <Text style={{ fontSize: 12, color: '#444' }}>Base: ₹{baseAmount.toFixed(2)}</Text>
                            <Text style={{ fontSize: 12, color: '#444' }}>GST ({gstRate}%): ₹{gstAmount.toFixed(2)}</Text>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#5856D6' }}>Total: ₹{totalAmount.toFixed(2)}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}

                  {/* Save Amounts Button */}
                  <TouchableOpacity
                    style={[styles.saveAmountsButton, savingAmounts && { opacity: 0.6 }]}
                    onPress={handleSaveAmounts}
                    disabled={savingAmounts}
                  >
                    {savingAmounts ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.saveAmountsText}>💾 Save Amounts to Receipt</Text>
                    )}
                  </TouchableOpacity>

                  {/* Summary totals (shows saved amounts) */}
                  {parseFloat(selectedReceipt.receipt?.total_amount) > 0 && (
                    <View style={styles.modalSummary}>
                      <Text style={styles.modalSummaryText}>Total GST: ₹{parseFloat(selectedReceipt.receipt?.total_gst_amount || 0).toFixed(2)}</Text>
                      <Text style={styles.modalSummaryTotal}>Grand Total: ₹{parseFloat(selectedReceipt.receipt?.total_amount || 0).toFixed(2)}</Text>
                    </View>
                  )}
                </ScrollView>
                {selectedReceipt.receipt?.status === 'pending' && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleRejectReceipt(selectedReceipt.receipt.id)}
                    >
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleApproveReceipt(selectedReceipt.receipt.id)}
                    >
                      <Text style={styles.actionButtonText}>Approve</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

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
                    <View key={index} style={styles.modalItemCard}>
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

      {/* Status Update Modal */}
      <Modal
        visible={statusModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Order Status</Text>
            <Text style={styles.modalSubtitle}>
              {selectedOrder?.item_name || `PO #${selectedOrder?.purchase_order_id}`}
            </Text>

            <View style={styles.statusOptions}>
              <TouchableOpacity
                style={[styles.statusOption, { backgroundColor: getStatusColor('confirmed') }]}
                onPress={() => handleStatusUpdate('confirmed')}
                disabled={updatingStatus}
              >
                <Text style={styles.statusOptionText}>Order Placed</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusOption, { backgroundColor: getStatusColor('shipped') }]}
                onPress={() => handleStatusUpdate('shipped')}
                disabled={updatingStatus}
              >
                <Text style={styles.statusOptionText}>Shipped</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusOption, { backgroundColor: '#AF52DE' }]}
                onPress={() => handleStatusUpdate('dispatched')}
                disabled={updatingStatus}
              >
                <Text style={styles.statusOptionText}>Dispatched</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusOption, { backgroundColor: '#34C759' }]}
                onPress={() => handleStatusUpdate('delivered')}
                disabled={updatingStatus}
              >
                <Text style={styles.statusOptionText}>Delivered</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusOption, styles.cancelOption]}
                onPress={() => setStatusModalVisible(false)}
                disabled={updatingStatus}
              >
                <Text style={[styles.statusOptionText, { color: '#666' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {updatingStatus && (
              <ActivityIndicator style={{ marginTop: 20 }} color="#FF9500" />
            )}
          </View>
        </View>
      </Modal>

      <Footer />
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
  // ── Tabs ──────────────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#5856D6',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
  },
  tabTextActive: {
    color: 'white',
  },
  // ── Section / Order cards ─────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 5,
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
  },
  orderCardPartial: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  orderCardComplete: {
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderItemName: {
    fontSize: 16,
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
  // ── Receipt status badge ──────────────────────────────────────────────────
  receiptStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  receiptStatusComplete: {
    backgroundColor: '#34C75922',
    borderWidth: 1,
    borderColor: '#34C759',
  },
  receiptStatusPartial: {
    backgroundColor: '#FF950022',
    borderWidth: 1,
    borderColor: '#FF9500',
  },
  receiptStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  // ── Order details ─────────────────────────────────────────────────────────
  orderDetails: {
    marginTop: 5,
  },
  orderDetailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 3,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  receiptButton: {
    padding: 8,
    borderRadius: 5,
    marginTop: 6,
    alignItems: 'center',
  },
  receiptButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  // ── Modals ────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  statusOptions: {
    gap: 10,
  },
  statusOption: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  statusOptionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelOption: {
    backgroundColor: '#eee',
    marginTop: 10,
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  modalBody: {
    maxHeight: 500,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  billImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    marginBottom: 15,
  },
  modalItemCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  modalItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  modalItemText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  modalSummary: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  modalSummaryText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  modalSummaryTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF9500',
    marginTop: 5,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalInfoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  modalInfoLabel: {
    width: 80,
    fontWeight: 'bold',
    color: '#333',
  },
  modalInfoValue: {
    flex: 1,
    color: '#666',
  },
  amountInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: '#333',
  },
  saveAmountsButton: {
    backgroundColor: '#5856D6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  saveAmountsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // ── New Styles for Grouped View ───────────────────────────────────────────
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
    borderRadius: 6,
  },
  itemNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  itemQtyText: {
    fontSize: 12,
    color: '#666',
  },
  receiptIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptIconText: {
    fontSize: 16,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  vendorContainer: {
    flex: 2,
  },
  dateContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  vendorHeader: {
    fontSize: 10,
    color: '#999',
    textTransform: 'uppercase',
  },
  vendorNameText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  orderDateHeader: {
    fontSize: 10,
    color: '#999',
    textTransform: 'uppercase',
  },
  orderDateText: {
    fontSize: 13,
    color: '#666',
  },
  orderActions: {
    marginTop: 15,
  },
  actionButtonMain: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonMainText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
