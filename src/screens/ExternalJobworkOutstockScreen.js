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
import QRCode from 'react-native-qrcode-svg';
import { projectsAPI } from '../config/api';
import Footer from '../components/Footer';

export default function ExternalJobworkOutstockScreen({ route, navigation }) {
  const { user } = route.params;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('pending');
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [fulfillmentModalVisible, setFulfillmentModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [fulfilling, setFulfilling] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [collectionsData, setCollectionsData] = useState({});
  const [recentCollection, setRecentCollection] = useState(null);
  const [showCollectionConfirm, setShowCollectionConfirm] = useState(false);
  const [lastShownCollectionId, setLastShownCollectionId] = useState(null);
  const [shouldFetchCollections, setShouldFetchCollections] = useState(true); // Control polling
  const [pollingInterval, setPollingInterval] = useState(null);
  const [previousRequestsState, setPreviousRequestsState] = useState({});

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await projectsAPI.getPendingExternalRequests();
      const newRequests = response.data.requests || [];
      setRequests(newRequests);

      // Check for newly fulfilled requests (for Store Incharge notification)
      checkForNewlyFulfilledRequests(newRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkForNewlyFulfilledRequests = (currentRequests) => {
    // Convert to map for easier comparison
    const currentMap = {};
    currentRequests.forEach(req => {
      currentMap[req.id] = req;
    });

    // Check each previous request
    Object.keys(previousRequestsState).forEach(requestId => {
      const prevReq = previousRequestsState[requestId];
      const currentReq = currentMap[requestId];

      // If status changed from pending to fulfilled
      if (prevReq && prevReq.status === 'pending' && currentReq && currentReq.status === 'fulfilled') {
        console.log('🎉 DETECTED: Request', requestId, 'just fulfilled!');
        
        // Show confirmation modal for Store Incharge
        setRecentCollection({
          id: currentReq.id,
          material_name: currentReq.material_name || currentReq.project_name,
          worker_name: currentReq.worker_name,
          collected_at: new Date().toLocaleString()
        });
        setShowCollectionConfirm(true);

        // Auto-hide after 2 seconds
        setTimeout(() => {
          setShowCollectionConfirm(false);
        }, 2000);
      }
    });

    // Update state for next comparison
    setPreviousRequestsState(currentMap);
  };

  useEffect(() => {
    // Fetch requests only once on component mount
    fetchRequests();

    // Set up polling to detect when workers fulfill requests
    // Store Incharge will see collection confirmation in real-time
    const interval = setInterval(() => {
      console.log('🔄 Poll: Checking for new collections...');
      fetchRequests();
    }, 5000); // Check every 5 seconds

    setPollingInterval(interval);

    // Cleanup on unmount
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const toggleExpand = (requestId) => {
    setExpandedRequestId(prev => (prev === requestId ? null : requestId));
  };

  const openFulfillmentModal = async (request) => {
    try {
      // Get detailed request info
      const response = await projectsAPI.getExternalRequestDetails(request.id);
      setSelectedRequest(response.data.request);
      setFulfillmentModalVisible(true);
      setQrCode('');
    } catch (error) {
      console.error('Error fetching request details:', error);
      Alert.alert('Error', 'Failed to fetch request details');
    }
  };

  const generateQRCode = (request) => {
    const qrPayload = {
      type: 'external_material_request',
      request_id: request.id,
      project_id: request.project_id,
      worker_id: request.worker_id,
      materials_count: request.items?.length || 0,
      timestamp: new Date().toISOString(),
    };
    
    setQrData(qrPayload);
    setSelectedRequest(request);
    setQrModalVisible(true);
  };

  const handleFulfillRequest = async () => {
    if (!qrCode.trim()) {
      Alert.alert('Error', 'Please scan the worker QR code');
      return;
    }

    if (!selectedRequest) {
      Alert.alert('Error', 'No request selected');
      return;
    }

    try {
      setFulfilling(true);
      console.log('🔄 Starting fulfillment process for request:', selectedRequest.id);

      // Verify QR code matches worker
      const expectedQRCode = `user_${selectedRequest.worker_id}`;
      const receivedQRCode = qrCode.trim();

      console.log('🔍 QR code verification:', {
        expected: expectedQRCode,
        received: receivedQRCode,
        workerId: selectedRequest.worker_id
      });

      if (receivedQRCode !== expectedQRCode && receivedQRCode !== selectedRequest.worker_id.toString()) {
        Alert.alert('Error', 'QR code does not match the assigned worker');
        setQrCode('');
        return;
      }

      console.log('✅ QR code verified');

      // Fulfill the request
      const fulfillmentData = {
        qr_code: receivedQRCode,
        qr_verification_status: 'verified',
        transaction_notes: `Fulfilled on ${new Date().toLocaleString()}`
      };

      console.log('📤 Sending fulfillment request to backend...');
      const response = await projectsAPI.fulfillExternalRequest(selectedRequest.id, fulfillmentData);
      
      console.log('✅ Fulfillment successful:', response.data);

      // Update local state immediately - mark request as fulfilled
      setRequests(prevRequests => 
        prevRequests.map(req => 
          req.id === selectedRequest.id 
            ? { ...req, status: 'fulfilled' }
            : req
        )
      );

      // Show notification immediately after successful collection
      setRecentCollection({
        id: selectedRequest.id,
        material_name: selectedRequest.material_name,
        worker_name: selectedRequest.worker_name,
        collected_at: new Date().toLocaleString()
      });
      setShowCollectionConfirm(true);

      // Auto-hide notification after 2 seconds
      setTimeout(() => {
        setShowCollectionConfirm(false);
      }, 2000);

      // Close modal after showing notification
      setTimeout(() => {
        setFulfillmentModalVisible(false);
        setSelectedRequest(null);
        setQrCode('');
        setExpandedRequestId(null);
        console.log('📋 Refreshing requests list from backend...');
        // Refresh from backend to ensure consistency
        fetchRequests();
      }, 2000);  // Reduced from 2500ms to 2000ms
    } catch (error) {
      console.error('❌ Error fulfilling request:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error message:', error.message);
      
      const errorMsg = error.response?.data?.error || error.message || 'Failed to fulfill request';
      
      // Check if this is a network timeout or temporary error
      if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        console.warn('⚠️ Network error detected, but request may have been processed. Refreshing...');
        // Try to refresh to see if it actually succeeded
        setTimeout(() => {
          fetchRequests();
        }, 1000);
        Alert.alert('Network Issue', 'Network error detected. Request status is being checked...');
      } else {
        Alert.alert('Error', errorMsg);
      }
      
      setQrCode('');
    } finally {
      setFulfilling(false);
    }
  };

  const getFilteredRequests = () => {
    if (selectedTab === 'pending') {
      return requests.filter(r => r.status === 'pending');
    } else if (selectedTab === 'fulfilled') {
      return requests.filter(r => r.status === 'fulfilled');
    } else if (selectedTab === 'collections') {
      return requests.filter(r => collectionsData[r.id] && collectionsData[r.id].length > 0);
    }
    return requests;
  };

  const filteredRequests = getFilteredRequests();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>⬅ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>External Job Work Outstock</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'pending' && styles.tabActive]}
          onPress={() => setSelectedTab('pending')}
        >
          <Text style={[styles.tabText, selectedTab === 'pending' && styles.tabTextActive]}>
            ⏳ Pending ({requests.filter(r => r.status === 'pending').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'fulfilled' && styles.tabActive]}
          onPress={() => setSelectedTab('fulfilled')}
        >
          <Text style={[styles.tabText, selectedTab === 'fulfilled' && styles.tabTextActive]}>
            ✅ Fulfilled ({requests.filter(r => r.status === 'fulfilled').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'collections' && styles.tabActive]}
          onPress={() => setSelectedTab('collections')}
        >
          <Text style={[styles.tabText, selectedTab === 'collections' && styles.tabTextActive]}>
            📦 Collected ({Object.values(collectionsData).reduce((sum, arr) => sum + arr.length, 0)})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#FFC107" />
          <Text style={styles.loaderText}>Loading requests...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {filteredRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {selectedTab === 'pending' 
                  ? 'No pending requests' 
                  : selectedTab === 'fulfilled'
                  ? 'No fulfilled requests'
                  : 'No collection records yet'}
              </Text>
            </View>
          ) : (
            filteredRequests.map(request => {
              const isExpanded = expandedRequestId === request.id;
              const collections = collectionsData[request.id] || [];

              return (
                <View key={request.id} style={styles.requestCard}>
                  {/* Card Header */}
                  <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => toggleExpand(request.id)}
                  >
                    <View style={styles.headerContent}>
                      <Text style={styles.projectName}>{request.project_name}</Text>
                      <Text style={styles.projectId}>ID: {request.project_id}</Text>
                      <Text style={styles.requestedBy}>By: {request.requested_by_name}</Text>
                      <Text style={styles.workerName}>Worker: {request.worker_name}</Text>
                      <Text style={styles.requestDate}>
                        {new Date(request.request_date).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.headerRight}>
                      <View style={[
                        styles.statusBadge,
                        request.status === 'pending' ? styles.statusPending : styles.statusFulfilled
                      ]}>
                        <Text style={styles.statusText}>
                          {selectedTab === 'collections' 
                            ? `${collections.length} Collected`
                            : request.status === 'pending' ? 'Pending' : 'Fulfilled'}
                        </Text>
                      </View>
                      <Text style={styles.expandArrow}>{isExpanded ? '▲' : '▼'}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <View style={styles.cardDetails}>
                      <View style={styles.divider} />

                      {selectedTab === 'collections' && collections.length > 0 ? (
                        <>
                          <Text style={styles.sectionTitle}>✅ Collection Records</Text>
                          {collections.map((collection, idx) => (
                            <View key={idx} style={styles.collectionCard}>
                              <View style={styles.collectionHeader}>
                                <Text style={styles.collectionWorker}>{collection.worker_name}</Text>
                                <Text style={styles.collectionStatus}>✓ Collected</Text>
                              </View>
                              <Text style={styles.collectionTime}>
                                {new Date(collection.collection_timestamp).toLocaleString()}
                              </Text>
                              <Text style={styles.collectionId}>
                                Collection ID: {collection.id}
                              </Text>
                            </View>
                          ))}
                        </>
                      ) : (
                        <>
                          {/* Materials List */}
                          <Text style={styles.sectionTitle}>📦 Requested Materials</Text>
                          {request.items && request.items.map((item, idx) => (
                            <View key={idx} style={styles.itemRow}>
                              <View style={styles.itemInfo}>
                                <Text style={styles.itemName}>{item.material_name}</Text>
                                <Text style={styles.itemDetails}>
                                  Requested: {item.requested_quantity} {item.unit}
                                </Text>
                                {item.available_quantity !== undefined && (
                                  <Text style={styles.itemAvailable}>
                                    Available: {item.available_quantity} {item.unit}
                                  </Text>
                                )}
                              </View>
                            </View>
                          ))}

                          {/* Notes */}
                          {request.request_notes && (
                            <>
                              <Text style={[styles.sectionTitle, { marginTop: 10 }]}>📝 Notes</Text>
                              <Text style={styles.notesText}>{request.request_notes}</Text>
                            </>
                          )}

                          <View style={styles.divider} />

                          {/* Action Buttons */}
                          {request.status === 'pending' && (
                            <View style={styles.actionButtonsContainer}>
                              <TouchableOpacity
                                style={[styles.fulfillBtn, { flex: 1, marginRight: 8 }]}
                                onPress={() => openFulfillmentModal(request)}
                              >
                                <Text style={styles.fulfillBtnText}>🔍 Verify Collection</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.qrBtn, { flex: 1 }]}
                                onPress={() => generateQRCode(request)}
                              >
                                <Text style={styles.qrBtnText}>📱 Generate QR Code</Text>
                              </TouchableOpacity>
                            </View>
                          )}

                          {request.status === 'fulfilled' && (
                            <View style={styles.fulfilledBadgeContainer}>
                              <Text style={styles.fulfilledText}>✅ This request has been fulfilled</Text>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Fulfillment Modal */}
      {fulfillmentModalVisible && selectedRequest && (
        <Modal
          visible={fulfillmentModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setFulfillmentModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={styles.modalTitle}>Fulfill Material Request</Text>
                <Text style={styles.modalSubtitle}>Project: {selectedRequest.project_name}</Text>

                {/* Request Summary */}
                <View style={styles.summarySection}>
                  <Text style={styles.summaryLabel}>Worker:</Text>
                  <Text style={styles.summaryValue}>{selectedRequest.worker_name}</Text>

                  <Text style={[styles.summaryLabel, { marginTop: 8 }]}>Requested Materials:</Text>
                  {selectedRequest.items && selectedRequest.items.map((item, idx) => (
                    <Text key={idx} style={styles.summaryValue}>
                      • {item.material_name}: {item.requested_quantity} {item.unit}
                    </Text>
                  ))}
                </View>

                {/* Availability Check */}
                <View style={styles.availabilitySection}>
                  <Text style={styles.checklistTitle}>✓ Stock Availability Check</Text>
                  {selectedRequest.items && selectedRequest.items.map((item, idx) => {
                    const isAvailable = item.available_quantity >= item.requested_quantity;
                    return (
                      <View key={idx} style={styles.checklistItem}>
                        <Text style={[
                          styles.checklistItemText,
                          !isAvailable && styles.checklistItemWarning
                        ]}>
                          {isAvailable ? '✅' : '❌'} {item.material_name}
                        </Text>
                        <Text style={[
                          styles.checklistItemDetail,
                          !isAvailable && styles.checklistItemDetailWarning
                        ]}>
                          {isAvailable 
                            ? `Available: ${item.available_quantity} (sufficient)` 
                            : `Available: ${item.available_quantity}, Needed: ${item.requested_quantity} (INSUFFICIENT)`
                          }
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* QR Code Scanning */}
                <View style={styles.qrSection}>
                  <Text style={styles.qrLabel}>Scan Worker QR Code *</Text>
                  <TextInput
                    style={styles.qrInput}
                    placeholder="Tap camera icon or paste QR code"
                    value={qrCode}
                    onChangeText={setQrCode}
                    placeholderTextColor="#8E8E93"
                  />
                  <Text style={styles.qrHint}>Expected format: user_{selectedRequest.worker_id}</Text>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => {
                    setFulfillmentModalVisible(false);
                    setSelectedRequest(null);
                    setQrCode('');
                  }}
                  disabled={fulfilling}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.fulfillModalBtn]}
                  onPress={handleFulfillRequest}
                  disabled={fulfilling}
                >
                  {fulfilling ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.fulfillModalBtnText}>Fulfill Request</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* QR Code Modal */}
      <Modal
        visible={qrModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContent}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>Generate QR Code for Worker</Text>
              <TouchableOpacity
                style={styles.qrCloseBtn}
                onPress={() => setQrModalVisible(false)}
              >
                <Text style={styles.qrCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.qrModalBody}>
              {selectedRequest && (
                <>
                  <View style={styles.qrRequestInfo}>
                    <Text style={styles.qrInfoLabel}>Project:</Text>
                    <Text style={styles.qrInfoValue}>{selectedRequest.project_name}</Text>
                    
                    <Text style={styles.qrInfoLabel}>Worker:</Text>
                    <Text style={styles.qrInfoValue}>{selectedRequest.worker_name}</Text>
                    
                    <Text style={styles.qrInfoLabel}>Materials:</Text>
                    <Text style={styles.qrInfoValue}>{selectedRequest.items?.length || 0} items</Text>
                  </View>

                  <Text style={styles.qrInstructions}>
                    📱 Ask the worker to scan this QR code from their phone
                  </Text>

                  <View style={styles.qrCodeContainer}>
                    {qrData && (
                      <QRCode
                        value={JSON.stringify(qrData)}
                        size={250}
                        color="black"
                        backgroundColor="white"
                      />
                    )}
                  </View>

                  <View style={styles.qrManualCode}>
                    <Text style={styles.qrManualLabel}>Or share this code:</Text>
                    <Text style={styles.qrManualValue}>REQ-{selectedRequest.id}</Text>
                    <Text style={styles.qrManualSubtext}>Worker can enter this code manually</Text>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.qrModalButtons}>
              <TouchableOpacity
                style={[styles.qrModalBtn, styles.qrModalBtnPrimary]}
                onPress={() => setQrModalVisible(false)}
              >
                <Text style={styles.qrModalBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Collection Confirmation Modal - Real-time notification for Store Incharge */}
      <Modal
        visible={showCollectionConfirm}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCollectionConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContent}>
            <Text style={styles.confirmIcon}>✅</Text>
            <Text style={styles.confirmTitle}>Material Collected!</Text>
            {recentCollection && (
              <>
                <Text style={styles.confirmWorker}>
                  Collected by: {recentCollection.worker_name}
                </Text>
                <Text style={styles.confirmTime}>
                  {new Date(recentCollection.collection_timestamp).toLocaleTimeString()}
                </Text>
              </>
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
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#FFC107',
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
    borderBottomColor: '#FFC107',
  },
  tabText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFC107',
    fontWeight: '700',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    color: '#666',
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 15,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  projectName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  projectId: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  requestedBy: {
    fontSize: 12,
    color: '#3A3A3C',
    marginTop: 2,
  },
  workerName: {
    fontSize: 12,
    color: '#3A3A3C',
    marginTop: 2,
  },
  requestDate: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 3,
  },
  headerRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
  },
  statusFulfilled: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFC107',
  },
  expandArrow: {
    fontSize: 12,
    color: '#8E8E93',
  },
  cardDetails: {
    padding: 12,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  itemRow: {
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    padding: 10,
    marginBottom: 6,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  itemDetails: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 3,
  },
  itemAvailable: {
    fontSize: 12,
    color: '#34C759',
    marginTop: 2,
  },
  notesText: {
    fontSize: 12,
    color: '#3A3A3C',
    fontStyle: 'italic',
    backgroundColor: '#F2F2F7',
    padding: 8,
    borderRadius: 6,
  },
  fulfillBtn: {
    backgroundColor: '#FFC107',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  fulfillBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  fulfilledBadgeContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  fulfilledText: {
    color: '#34C759',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 15,
  },
  summarySection: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3A3A3C',
  },
  summaryValue: {
    fontSize: 12,
    color: '#1C1C1E',
    marginTop: 2,
  },
  availabilitySection: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: 12,
    marginBottom: 15,
  },
  checklistTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 10,
  },
  checklistItem: {
    marginBottom: 8,
  },
  checklistItemText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
  },
  checklistItemWarning: {
    color: '#FF3B30',
  },
  checklistItemDetail: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  checklistItemDetailWarning: {
    color: '#FF3B30',
  },
  qrSection: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  qrLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  qrInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
    color: '#1C1C1E',
    marginBottom: 6,
  },
  qrHint: {
    fontSize: 11,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F2F2F7',
  },
  cancelBtnText: {
    color: '#FF3B30',
    fontWeight: 'bold',
    fontSize: 14,
  },
  fulfillModalBtn: {
    backgroundColor: '#FFC107',
  },
  fulfillModalBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  qrBtn: {
    backgroundColor: '#5856D6',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  qrBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  qrModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  qrModalHeader: {
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  qrCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCloseBtnText: {
    fontSize: 18,
    color: '#8E8E93',
    fontWeight: 'bold',
  },
  qrModalBody: {
    padding: 20,
    alignItems: 'center',
  },
  qrRequestInfo: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    width: '100%',
  },
  qrInfoLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 8,
  },
  qrInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  qrInstructions: {
    fontSize: 13,
    color: '#3A3A3C',
    marginBottom: 20,
    textAlign: 'center',
  },
  qrCodeContainer: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#F2F2F7',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrManualCode: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  qrManualLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 8,
  },
  qrManualValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9500',
    letterSpacing: 2,
  },
  qrManualSubtext: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 6,
  },
  qrModalButtons: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  qrModalBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  qrModalBtnPrimary: {
    backgroundColor: '#5856D6',
  },
  qrModalBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  collectionCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  collectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  collectionWorker: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  collectionStatus: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34C759',
  },
  collectionTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  collectionId: {
    fontSize: 11,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
  },
  confirmIcon: {
    fontSize: 70,
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 15,
    textAlign: 'center',
  },
  confirmWorker: {
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 8,
    fontWeight: '600',
  },
  confirmTime: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
});