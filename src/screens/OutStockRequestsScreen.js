import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import QRCode from 'react-native-qrcode-svg';
import { projectsAPI } from '../config/api';
import Footer from '../components/Footer';

export default function OutStockRequestsScreen({ route, navigation }) {
  const { user } = route.params || {};
  const [requests, setRequests] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [allocationTasks, setAllocationTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'processed', 'fulfilled', 'all'
  const [expandedRequestId, setExpandedRequestId] = useState(null);

  // Allocation modal states
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [allocations, setAllocations] = useState({}); // key: itemId, value: quantity string

  // QR Code display states
  const [generatedQrCode, setGeneratedQrCode] = useState(null);
  const [generatedTask, setGeneratedTask] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [deliverySuccess, setDeliverySuccess] = useState(false);
  const [deliveredWorkerName, setDeliveredWorkerName] = useState(null);

  const fetchStoreRequests = async () => {
    try {
      const response = await projectsAPI.getStoreRequests(user.company_id);
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error fetching store requests:', error);
      Alert.alert('Error', 'Failed to fetch store requests.');
    }
  };

  const fetchWorkers = async () => {
    try {
      const response = await projectsAPI.getWorkers(user.company_id);
      setWorkers(response.data.workers || []);
      if (response.data.workers && response.data.workers.length > 0) {
        setSelectedWorkerId(response.data.workers[0].id.toString());
      }
    } catch (error) {
      console.error('Error fetching workers:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await projectsAPI.getInventory(user.company_id);
      setInventory(response.data.inventory || []);
    } catch (error) {
      console.error('Error fetching inventory for stock checking:', error);
    }
  };

  const fetchAllocationTasks = async () => {
    try {
      const response = await projectsAPI.getCompanyAllocationTasks(user.company_id);
      setAllocationTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Error fetching allocation tasks:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStoreRequests(),
      fetchWorkers(),
      fetchInventory(),
      fetchAllocationTasks(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let intervalId;
    if (showQrModal && generatedTask?.qr_number) {
      setDeliverySuccess(false);
      setDeliveredWorkerName(null);

      intervalId = setInterval(async () => {
        try {
          const response = await projectsAPI.getAllocationTaskByQR(generatedTask.qr_number);
          const taskData = response.data.task;
          if (taskData && taskData.status === 'confirmed') {
            setDeliverySuccess(true);
            setDeliveredWorkerName(taskData.worker_name);
            clearInterval(intervalId);
            fetchStoreRequests();
            fetchAllocationTasks();
          }
        } catch (error) {
          console.error('Error polling allocation task status:', error);
        }
      }, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showQrModal, generatedTask]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchStoreRequests(),
      fetchInventory(),
      fetchAllocationTasks(),
    ]);
    setRefreshing(false);
  }, []);

  const toggleExpandRequest = (requestId) => {
    setExpandedRequestId(expandedRequestId === requestId ? null : requestId);
  };

  const toggleExpandProcessedTask = (taskId) => {
    const key = `task-${taskId}`;
    setExpandedRequestId(expandedRequestId === key ? null : key);
  };

  const getInventoryStock = (itemName) => {
    if (!itemName) return 0;
    const matchingItems = inventory.filter(
      (item) => item.item_name?.trim().toLowerCase() === itemName.trim().toLowerCase()
    );
    return matchingItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  };

  const openAllocateModal = (request) => {
    setSelectedRequest(request);
    const initialAllocations = {};
    request.items.forEach((item) => {
      const totalQty = parseFloat(item.quantity) || 0;
      const alreadyAllocated = parseFloat(item.allocated_quantity) || 0;
      const remaining = Math.max(0, totalQty - alreadyAllocated);
      const stock = getInventoryStock(item.material_name);

      if (stock <= 0) {
        initialAllocations[item.id] = '0';
      } else {
        const prefillVal = Math.min(remaining, stock);
        initialAllocations[item.id] = prefillVal.toString();
      }
    });
    setAllocations(initialAllocations);
    if (request.allocated_to_worker_id) {
      setSelectedWorkerId(request.allocated_to_worker_id.toString());
    } else {
      setSelectedWorkerId('');
    }
    setShowAllocateModal(true);
  };

  const handleAllocationQtyChange = (itemId, val) => {
    setAllocations((prev) => ({
      ...prev,
      [itemId]: val,
    }));
  };

  const handleGenerateQR = async () => {
    if (!selectedWorkerId) {
      Alert.alert('Error', 'Please select a worker first.');
      return;
    }

    const itemAllocations = [];
    let hasInvalidQty = false;

    for (const item of selectedRequest.items) {
      const allocatedQty = parseFloat(allocations[item.id]) || 0;
      if (allocatedQty < 0) {
        hasInvalidQty = true;
        Alert.alert('Error', `Allocation quantity for ${item.material_name} cannot be negative.`);
        break;
      }
      if (allocatedQty > 0) {
        const totalQty = parseFloat(item.quantity) || 0;
        const alreadyAllocated = parseFloat(item.allocated_quantity) || 0;
        const remaining = totalQty - alreadyAllocated;
        const stock = getInventoryStock(item.material_name);

        if (allocatedQty > remaining) {
          Alert.alert(
            'Quantity Warning',
            `Fulfillment of "${item.material_name}" (${allocatedQty}) exceeds the remaining requested amount (${remaining}).`
          );
          hasInvalidQty = true;
          break;
        }

        if (allocatedQty > stock) {
          Alert.alert(
            'Stock Insufficient',
            `Cannot allocate ${allocatedQty} of "${item.material_name}" because only ${stock} units are in stock.`
          );
          hasInvalidQty = true;
          break;
        }

        itemAllocations.push({
          item_id: item.id,
          allocated_quantity: allocatedQty,
        });
      }
    }

    if (hasInvalidQty) return;

    if (itemAllocations.length === 0) {
      Alert.alert('Error', 'Please allocate a quantity > 0 for at least one item.');
      return;
    }

    setAllocating(true);
    try {
      const payload = {
        worker_id: parseInt(selectedWorkerId),
        allocated_by: user.id,
        is_partial: true,
        item_allocations: itemAllocations,
      };

      const response = await projectsAPI.allocateStockToWorker(selectedRequest.id, payload);
      const taskObj = response.data.allocation_task;
      const qrCodeVal = taskObj ? taskObj.allocation_qr_code : null;

      setGeneratedQrCode(qrCodeVal);
      setGeneratedTask(taskObj);
      setShowAllocateModal(false);
      setShowQrModal(true);
      
      // Refresh requests and active tasks
      fetchStoreRequests();
      fetchAllocationTasks();
    } catch (error) {
      console.error('Error generating stock allocation QR:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to allocate stock.');
    } finally {
      setAllocating(false);
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'fulfilled':
        return styles.statusFulfilled;
      case 'partially_allocated':
      case 'partially_fulfilled':
        return styles.statusPartial;
      case 'rejected':
        return styles.statusRejected;
      case 'pending':
      default:
        return styles.statusPending;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'fulfilled':
        return 'FULFILLED';
      case 'partially_allocated':
      case 'partially_fulfilled':
        return 'PARTIAL';
      case 'rejected':
        return 'REJECTED';
      case 'pending':
      default:
        return 'PENDING';
    }
  };

  const getListData = () => {
    if (activeTab === 'processed') {
      return allocationTasks.filter((t) => t.status === 'pending');
    }

    // Collect IDs of requests that currently have a pending allocation task
    const pendingTaskRequestIds = new Set(
      allocationTasks
        .filter((t) => t.status === 'pending')
        .map((t) => t.store_request_id)
    );

    return requests.filter((req) => {
      if (activeTab === 'pending') {
        const isPendingStatus =
          req.status === 'pending' ||
          req.status === 'partially_allocated' ||
          req.status === 'partially_fulfilled';
        return isPendingStatus && !pendingTaskRequestIds.has(req.id);
      }
      if (activeTab === 'fulfilled') {
        return req.status === 'fulfilled';
      }
      return true; // 'all'
    });
  };

  const renderRequestItem = ({ item }) => {
    const isExpanded = expandedRequestId === item.id;
    const dateStr = new Date(item.request_date).toLocaleDateString();

    return (
      <View style={styles.card}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpandRequest(item.id)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.projectName}>{item.project_name}</Text>
            <Text style={styles.pmName}>Requested by: {item.project_manager_name}</Text>
            {item.allocated_to_worker_name && (
              <Text style={styles.workerLabelText}>Worker to collect: {item.allocated_to_worker_name}</Text>
            )}
            <Text style={styles.dateText}>Date: {dateStr}</Text>
          </View>
          <View style={[styles.statusBadge, getStatusBadgeStyle(item.status)]}>
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.cardContent}>
            <Text style={styles.sectionHeader}>Requested Items:</Text>
            {item.items.map((material) => {
              const reqQty = parseFloat(material.quantity) || 0;
              const allocQty = parseFloat(material.allocated_quantity) || 0;
              const remaining = Math.max(0, reqQty - allocQty);
              const availableStock = getInventoryStock(material.material_name);

              return (
                <View key={material.id} style={styles.itemRow}>
                  <View style={{ flex: 2 }}>
                    <Text style={styles.materialName}>{material.material_name}</Text>
                    {material.hsn && <Text style={styles.itemSubtext}>HSN: {material.hsn}</Text>}
                    {material.notes && <Text style={styles.itemNotes}>Note: {material.notes}</Text>}
                  </View>
                  <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                    <Text style={styles.qtyText}>Requested: {reqQty} {material.unit}</Text>
                    <Text style={styles.qtyAllocatedText}>Fulfilled: {allocQty} {material.unit}</Text>
                    {remaining > 0 ? (
                      <Text style={styles.qtyRemainingText}>Remaining: {remaining} {material.unit}</Text>
                    ) : (
                      <Text style={styles.qtyCompleteText}>Completed</Text>
                    )}
                    {availableStock > 0 ? (
                      <Text style={styles.stockAvailableText}>
                        🟢 Stock: {availableStock} {material.unit}
                      </Text>
                    ) : (
                      <Text style={styles.stockOutText}>
                        🔴 Out of Stock
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}

            {item.notes && (
              <View style={styles.pmNotesBox}>
                <Text style={styles.notesTitle}>PM Notes:</Text>
                <Text style={styles.notesText}>{item.notes}</Text>
              </View>
            )}

            {item.status !== 'fulfilled' && item.status !== 'rejected' && (
              <TouchableOpacity
                style={styles.allocateButton}
                onPress={() => openAllocateModal(item)}
              >
                <Text style={styles.allocateButtonText}>📤 Fulfill / Out Stock</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderProcessedTask = ({ item }) => {
    const isExpanded = expandedRequestId === `task-${item.id}`;
    const dateStr = new Date(item.created_at).toLocaleString();
    const allocatedItems =
      typeof item.allocated_items === 'string'
        ? JSON.parse(item.allocated_items)
        : item.allocated_items || [];

    return (
      <View style={styles.card}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpandProcessedTask(item.id)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.projectName}>{item.project_name}</Text>
            <Text style={styles.pmName}>Worker: {item.worker_name}</Text>
            <Text style={styles.dateText}>Created: {dateStr}</Text>
            <Text style={styles.taskIdText}>QR Code: {item.qr_number}</Text>
          </View>
          <View style={[styles.statusBadge, styles.statusProcessed]}>
            <Text style={styles.statusText}>PROCESSED</Text>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.cardContent}>
            <Text style={styles.sectionHeader}>Allocated Items:</Text>
            {allocatedItems.map((mat, idx) => (
              <View key={idx} style={styles.itemRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.materialName}>{mat.material_name}</Text>
                  {mat.hsn && <Text style={styles.itemSubtext}>HSN: {mat.hsn}</Text>}
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.qtyText}>
                    {mat.quantity} {mat.unit}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.processedButtonRow}>
              <TouchableOpacity
                style={styles.viewQrButton}
                onPress={() => {
                  setGeneratedQrCode(item.allocation_qr_code);
                  setGeneratedTask(item);
                  setShowQrModal(true);
                }}
              >
                <Text style={styles.viewQrButtonText}>🔍 View QR Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderItem = ({ item }) => {
    if (activeTab === 'processed') {
      return renderProcessedTask({ item });
    }
    return renderRequestItem({ item });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Out Stock Management</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'processed' && styles.activeTab]}
          onPress={() => setActiveTab('processed')}
        >
          <Text style={[styles.tabText, activeTab === 'processed' && styles.activeTabText]}>Processed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'fulfilled' && styles.activeTab]}
          onPress={() => setActiveTab('fulfilled')}
        >
          <Text style={[styles.tabText, activeTab === 'fulfilled' && styles.activeTabText]}>Fulfilled</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFC107" />
          <Text style={styles.loadingText}>Fetching stock requests...</Text>
        </View>
      ) : (
        <FlatList
          data={getListData()}
          renderItem={renderItem}
          keyExtractor={(item, index) => (activeTab === 'processed' ? `task-${item.id}` : `req-${item.id}`)}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FFC107']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No items found for this tab.</Text>
            </View>
          }
        />
      )}

      {/* Allocation/Fulfillment Modal */}
      {selectedRequest && (
        <Modal
          visible={showAllocateModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAllocateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Fulfill Stock Request</Text>
                <TouchableOpacity onPress={() => setShowAllocateModal(false)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalLabel}>Worker to Collect Items</Text>
                <View style={styles.workerDisplayBox}>
                  <Text style={styles.workerDisplayText}>
                    {selectedRequest.allocated_to_worker_name || 'No worker assigned by PM'}
                  </Text>
                </View>

                <Text style={styles.sectionHeader}>Adjust Fulfill Quantity:</Text>
                {selectedRequest.items.map((item) => {
                  const reqQty = parseFloat(item.quantity) || 0;
                  const allocQty = parseFloat(item.allocated_quantity) || 0;
                  const remaining = Math.max(0, reqQty - allocQty);
                  const availableStock = getInventoryStock(item.material_name);
                  const isOutOfStock = availableStock <= 0;

                  return (
                    <View key={item.id} style={[styles.modalItemRow, isOutOfStock && styles.outOfStockRow]}>
                      <View style={{ flex: 2 }}>
                        <Text style={styles.modalItemName}>{item.material_name}</Text>
                        <Text style={styles.modalItemSub}>
                          Remaining: {remaining} {item.unit}
                        </Text>
                        <Text style={isOutOfStock ? styles.modalStockOut : styles.modalStockAvailable}>
                          {isOutOfStock 
                            ? '🔴 Out of Stock' 
                            : `🟢 Available: ${availableStock} ${item.unit}`
                          }
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          style={[styles.quantityInput, isOutOfStock && styles.disabledInput]}
                          keyboardType="numeric"
                          value={allocations[item.id] || ''}
                          onChangeText={(val) => handleAllocationQtyChange(item.id, val)}
                          placeholder={`Max ${remaining}`}
                          editable={!isOutOfStock}
                        />
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowAllocateModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleGenerateQR}
                  disabled={allocating}
                >
                  {allocating ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Generate QR Code</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* QR Code Display Modal */}
      <Modal
        visible={showQrModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowQrModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <Text style={styles.qrModalTitle}>Stock Out QR Code</Text>
            {deliverySuccess ? (
              <View style={styles.successContainer}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successText}>Successfully Delivered!</Text>
                <Text style={styles.successSubtext}>
                  Worker {deliveredWorkerName || 'assigned worker'} has scanned the QR code and collected the items.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.qrModalSubtitle}>
                  Let the worker scan this code to confirm stock delivery.
                </Text>

                <View style={styles.qrWrapper}>
                  {generatedQrCode && (
                    <QRCode
                      value={generatedQrCode}
                      size={200}
                      color="black"
                      backgroundColor="white"
                    />
                  )}
                </View>

                {generatedTask && (
                  <Text style={styles.qrCodeVal}>ID: {generatedTask.qr_number}</Text>
                )}
              </>
            )}

            <TouchableOpacity
              style={styles.qrDoneButton}
              onPress={() => {
                setShowQrModal(false);
                setGeneratedQrCode(null);
                setGeneratedTask(null);
              }}
            >
              <Text style={styles.qrDoneText}>Done</Text>
            </TouchableOpacity>
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
    backgroundColor: '#f9f9f9',
  },
  header: {
    backgroundColor: '#FFC107',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: 5,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FFC107',
  },
  tabText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFC107',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#8E8E93',
  },
  listContainer: {
    padding: 15,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 14,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  pmName: {
    fontSize: 13,
    color: '#666',
    marginTop: 3,
  },
  workerLabelText: {
    fontSize: 13,
    color: '#FF9500',
    fontWeight: '600',
    marginTop: 3,
  },
  dateText: {
    fontSize: 11,
    color: '#999',
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusFulfilled: {
    backgroundColor: '#28A745',
  },
  statusPartial: {
    backgroundColor: '#FF9500',
  },
  statusPending: {
    backgroundColor: '#6C757D',
  },
  statusRejected: {
    backgroundColor: '#DC3545',
  },
  statusProcessed: {
    backgroundColor: '#007AFF',
  },
  cardContent: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  materialName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },
  itemSubtext: {
    fontSize: 11,
    color: '#888',
  },
  itemNotes: {
    fontSize: 11,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginTop: 2,
  },
  qtyText: {
    fontSize: 12,
    color: '#555',
  },
  qtyAllocatedText: {
    fontSize: 11,
    color: '#28A745',
    marginTop: 2,
  },
  qtyRemainingText: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: '500',
    marginTop: 2,
  },
  qtyCompleteText: {
    fontSize: 11,
    color: '#28A745',
    fontWeight: 'bold',
    marginTop: 2,
  },
  stockAvailableText: {
    fontSize: 11,
    color: '#28A745',
    fontWeight: 'bold',
    marginTop: 4,
  },
  stockOutText: {
    fontSize: 11,
    color: '#DC3545',
    fontWeight: 'bold',
    marginTop: 4,
  },
  taskIdText: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
    fontWeight: 'bold',
  },
  pmNotesBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 5,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FFC107',
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  notesText: {
    fontSize: 12,
    color: '#555',
    marginTop: 3,
  },
  allocateButton: {
    backgroundColor: '#FFC107',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  allocateButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  processedButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
  },
  viewQrButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
  },
  viewQrButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    width: '100%',
    maxHeight: '85%',
    overflow: 'hidden',
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FFC107',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 5,
  },
  closeBtnText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 15,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  modalItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  outOfStockRow: {
    backgroundColor: '#FFF0F2',
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  modalItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modalItemSub: {
    fontSize: 11,
    color: '#666',
    marginTop: 3,
  },
  modalStockAvailable: {
    fontSize: 11,
    color: '#28A745',
    fontWeight: '600',
    marginTop: 2,
  },
  modalStockOut: {
    fontSize: 11,
    color: '#DC3545',
    fontWeight: '600',
    marginTop: 2,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: '#fafafa',
  },
  disabledInput: {
    backgroundColor: '#EAEAEA',
    color: '#8E8E93',
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 15,
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: 'bold',
  },
  confirmBtn: {
    backgroundColor: '#FFC107',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  confirmBtnText: {
    color: 'white',
    fontWeight: 'bold',
  },
  qrModalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    width: '85%',
    alignItems: 'center',
    elevation: 10,
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  qrModalSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  qrWrapper: {
    padding: 15,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  qrCodeVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
    letterSpacing: 1,
  },
  qrDoneButton: {
    backgroundColor: '#FFC107',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  qrDoneText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  workerDisplayBox: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 20,
  },
  workerDisplayText: {
    fontSize: 15,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    padding: 20,
    marginVertical: 10,
  },
  successIcon: {
    fontSize: 54,
    marginBottom: 15,
  },
  successText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 10,
    textAlign: 'center',
  },
  successSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
