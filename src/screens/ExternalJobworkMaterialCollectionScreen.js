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
  Dimensions,
} from 'react-native';
import { projectsAPI } from '../config/api';
import Footer from '../components/Footer';

// Safe dynamic import for expo-camera
let CameraView = null;
let Camera = null;
try {
  const ExpoCamera = require('expo-camera');
  CameraView = ExpoCamera.CameraView;
  Camera = ExpoCamera.Camera;
} catch (e) {
  console.log('expo-camera not available');
}

const { width } = Dimensions.get('window');

export default function ExternalJobworkMaterialCollectionScreen({ route, navigation }) {
  const { user } = route.params;
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [submittingCode, setSubmittingCode] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [collectionSuccess, setCollectionSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await projectsAPI.getWorkerExternalMaterialRequests(user.id);
      setPendingRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      Alert.alert('Error', 'Failed to fetch material requests');
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    setScanning(true);
    setManualCode('');
    if (CameraView && Camera) {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    } else {
      setHasCameraPermission(false);
    }
  };

  const handleBarCodeScanned = async ({ data }) => {
    try {
      // Parse QR code payload
      const parsedData = JSON.parse(data);
      if (parsedData.type === 'external_material_request' && parsedData.request_id) {
        confirmMaterialCollection(parsedData.request_id);
      } else {
        Alert.alert('Invalid QR Code', 'The scanned QR code is not valid for material collection.');
        setScanning(false);
      }
    } catch (error) {
      // Fallback: treat raw scanned string as request ID (handle both numeric and REQ- format)
      handleManualVerify(data);
    }
  };

  const handleManualVerify = async (codeToVerify) => {
    const code = codeToVerify || manualCode;
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter a valid QR code.');
      return;
    }

    setSubmittingCode(true);
    try {
      // Verify and collect the materials
      await confirmMaterialCollection(code.trim());
    } catch (error) {
      console.error('Error verifying code:', error);
      Alert.alert('Error', 'Failed to verify QR code.');
      setSubmittingCode(false);
    }
  };

  const confirmMaterialCollection = async (requestIdParam) => {
    setSubmittingCode(true);
    try {
      // Use the request ID directly - backend will handle both formats
      const response = await projectsAPI.collectExternalMaterial(requestIdParam, {
        collected_by: user.id,
        collection_timestamp: new Date().toISOString(),
      });

      // Show success confirmation
      setSuccessMessage(`Materials collected successfully!\nCollection ID: ${response.data.collectionId}`);
      setCollectionSuccess(true);
      
      // Auto-close scanner after showing success
      setScanning(false);
      setManualCode('');
      
      // Reload data after 3 seconds
      setTimeout(() => {
        setCollectionSuccess(false);
        setSelectedRequest(null);
        fetchPendingRequests();
      }, 3000);
    } catch (error) {
      console.error('Error collecting materials:', error);
      const errMsg = error.response?.data?.error || 'Failed to collect materials.';
      Alert.alert('Collection Failed', errMsg);
      setSubmittingCode(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5856D6" />
        <Text style={styles.loadingText}>Loading material requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>⬅ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>External Material Collection</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>📋 How to Collect Materials</Text>
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>Store Incharge will generate a QR code for your request</Text>
          </View>
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>Tap "Scan QR Code" button below</Text>
          </View>
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>Scan the QR code or enter the code manually</Text>
          </View>
          <View style={styles.instructionStep}>
            <Text style={styles.stepNumber}>4</Text>
            <Text style={styles.stepText}>Materials will be marked as collected</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Your Pending Requests</Text>

        {pendingRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No Pending Material Requests</Text>
            <Text style={styles.emptySubtext}>
              You will see material requests here once the Project Manager creates one.
            </Text>
          </View>
        ) : (
          pendingRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.requestInfo}>
                  <Text style={styles.projectName}>{request.project_name}</Text>
                  <Text style={styles.requestStatus}>Status: Pending Pickup</Text>
                </View>
                <View style={styles.requestBadge}>
                  <Text style={styles.badgeText}>{request.items?.length || 0} Items</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.materialsLabel}>Materials to Collect:</Text>
              {request.items && request.items.length > 0 ? (
                request.items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.material_name}</Text>
                    <Text style={styles.itemQty}>
                      {item.requested_quantity} {item.unit}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noItemsText}>No items in this request</Text>
              )}

              {request.request_notes && (
                <>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.notesText}>{request.request_notes}</Text>
                </>
              )}

              <TouchableOpacity
                style={styles.scanBtn}
                onPress={startScanner}
              >
                <Text style={styles.scanBtnText}>📷 Scan QR Code to Collect</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Success Confirmation Modal */}
      <Modal
        visible={collectionSuccess}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCollectionSuccess(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Order Picked!</Text>
            <Text style={styles.successMessage}>{successMessage}</Text>
            <View style={styles.successDetails}>
              <Text style={styles.successDetailText}>Materials have been collected by worker</Text>
              <Text style={styles.successDetailText}>Store Incharge will be notified</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Scanner Modal */}
      <Modal
        visible={scanning}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setScanning(false)}
      >
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scan Material Collection QR</Text>
            <TouchableOpacity
              style={styles.closeScannerBtn}
              onPress={() => setScanning(false)}
            >
              <Text style={styles.closeScannerText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {hasCameraPermission === true && CameraView ? (
            <View style={styles.cameraContainer}>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={submittingCode ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
              />
              <View style={styles.overlayFrame}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanGuideText}>
                  Align the Store Incharge's QR Code inside the box
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.noCameraContainer}>
              <Text style={styles.noCameraIcon}>📷</Text>
              <Text style={styles.noCameraText}>Camera Access Not Available</Text>
              <Text style={styles.noCameraSub}>
                Please permit camera access or enter the code manually.
              </Text>
            </View>
          )}

          {/* Manual Code Entry */}
          <View style={styles.manualInputSection}>
            <Text style={styles.manualLabel}>Manual Collection Code:</Text>
            <TextInput
              style={styles.manualInput}
              placeholder="Enter code from Store Incharge"
              value={manualCode}
              onChangeText={setManualCode}
              editable={!submittingCode}
            />
            <TouchableOpacity
              style={[styles.submitBtn, submittingCode && styles.submitBtnDisabled]}
              onPress={() => handleManualVerify()}
              disabled={submittingCode || !manualCode.trim()}
            >
              {submittingCode ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitBtnText}>Collect Materials</Text>
              )}
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
    backgroundColor: '#F2F2F7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#8E8E93',
  },
  header: {
    backgroundColor: '#2E3A59',
    padding: 15,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  backText: {
    color: 'white',
    fontSize: 16,
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
  scrollContent: {
    padding: 15,
    paddingBottom: 30,
  },
  instructionCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#5856D6',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  instructionStep: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'center',
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#5856D6',
    color: 'white',
    textAlign: 'center',
    lineHeight: 30,
    fontWeight: 'bold',
    marginRight: 10,
  },
  stepText: {
    fontSize: 13,
    color: '#3A3A3C',
    flex: 1,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  requestInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  requestStatus: {
    fontSize: 12,
    color: '#FF9500',
    marginTop: 2,
    fontWeight: '600',
  },
  requestBadge: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginVertical: 10,
  },
  materialsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
    marginBottom: 6,
  },
  itemName: {
    fontSize: 13,
    color: '#1C1C1E',
    fontWeight: '500',
    flex: 1,
  },
  itemQty: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2E3A59',
  },
  noItemsText: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 10,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 13,
    color: '#3A3A3C',
    lineHeight: 18,
    marginBottom: 10,
  },
  scanBtn: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  scanBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  scannerHeader: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeScannerBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  closeScannerText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  overlayFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#34C759',
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  scanGuideText: {
    color: 'white',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  noCameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 20,
  },
  noCameraIcon: {
    fontSize: 54,
    color: '#8E8E93',
    marginBottom: 15,
  },
  noCameraText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noCameraSub: {
    color: '#8E8E93',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  manualInputSection: {
    backgroundColor: '#1C1C1E',
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  manualLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  manualInput: {
    backgroundColor: '#2C2C2E',
    color: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3C3C3E',
  },
  submitBtn: {
    backgroundColor: '#5856D6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '85%',
    maxWidth: 350,
  },
  successIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 10,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  successDetails: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    width: '100%',
  },
  successDetailText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginVertical: 4,
  },
});
