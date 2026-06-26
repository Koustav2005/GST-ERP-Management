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
  Image,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { projectsAPI, getApiUrl } from '../config/api';
import Footer from '../components/Footer';

export default function InternalJobWorkScreen({ route, navigation }) {
  const { user } = route.params;
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState(null);

  // Upload Challan Modal States
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [vendorEmail, setVendorEmail] = useState('');
  const [challanFile, setChallanFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    console.log('🔄 Screen loaded, fetching job work requests...');
    fetchJobWorkRequests();
  }, []);

  const fetchJobWorkRequests = async () => {
    try {
      setLoading(true);
      // For accountants, fetch only job works assigned to them with challan uploaded
      if (user.role === 'accountant') {
        const response = await projectsAPI.getAccountantJobWork(user.id);
        setRequests(response.data.requests || []);
      } else {
        const response = await projectsAPI.getJobWorkRequests(user.company_id);
        setRequests(response.data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching job work requests:', error);
      Alert.alert('Error', 'Failed to fetch internal job work requests.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedRequestId(prev => (prev === id ? null : id));
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setChallanFile({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/pdf',
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick a document.');
    }
  };

  const handleViewChallan = async (filePath) => {
    try {
      const baseUrl = getApiUrl().replace('/api', '');
      const fileUrl = `${baseUrl}${filePath}`;
      await WebBrowser.openBrowserAsync(fileUrl);
    } catch (error) {
      console.error('Error viewing file:', error);
      Alert.alert('Error', 'Failed to open file browser.');
    }
  };

  const handleViewImage = async (filePath) => {
    try {
      const baseUrl = getApiUrl().replace('/api', '');
      const imageUrl = `${baseUrl}${filePath}`;
      await WebBrowser.openBrowserAsync(imageUrl);
    } catch (error) {
      console.error('Error viewing image:', error);
      Alert.alert('Error', 'Failed to view image.');
    }
  };

  const handleUploadSubmit = async () => {
    if (!challanFile) {
      Alert.alert('Error', 'Please select a challan file.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('challan', {
        uri: Platform.OS === 'ios' ? challanFile.uri.replace('file://', '') : challanFile.uri,
        name: challanFile.name,
        type: challanFile.type,
      });

      if (vendorEmail) {
        formData.append('vendor_email', vendorEmail);
      }

      await projectsAPI.uploadJobWorkChallan(selectedRequest.id, formData);
      Alert.alert(
        'Success',
        vendorEmail
          ? 'Challan uploaded and email sent to vendor successfully!'
          : 'Challan uploaded successfully!'
      );

      // Close modal & reset
      setUploadModalVisible(false);
      setSelectedRequest(null);
      setVendorEmail('');
      setChallanFile(null);

      // Refresh list
      fetchJobWorkRequests();
    } catch (error) {
      console.error('Error uploading challan:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to upload challan.');
    } finally {
      setSubmitting(false);
    }
  };

  const openUploadModal = (req) => {
    setSelectedRequest(req);
    setVendorEmail(req.vendor_email || '');
    setChallanFile(null);
    setUploadModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>⬅ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {user.role === 'accountant' ? 'Shared Challans' : 'Internal Job Work'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#28A745" />
          <Text style={styles.loaderText}>Loading Job Work requests...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {requests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {user.role === 'accountant' 
                  ? 'No shared challans yet. Waiting for Store Incharge to upload.' 
                  : 'No Job Work requests found.'}
              </Text>
            </View>
          ) : (
            requests.map((item) => {
              const isExpanded = expandedRequestId === item.id;
              const isUploaded = item.status === 'challan_uploaded';

              return (
                <View key={item.id} style={styles.card}>
                  {/* Card Header Summary */}
                  <TouchableOpacity onPress={() => toggleExpand(item.id)} style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.jobIdText}>{item.job_id}</Text>
                      <Text style={styles.projectText}>Project: {item.project_name}</Text>
                      <Text style={styles.typeText}>Type: {item.job_work_type}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={[styles.badge, isUploaded ? styles.badgeSuccess : styles.badgeWarning]}>
                        <Text style={styles.badgeText}>
                          {isUploaded ? 'Challan Shared' : 'Pending Challan'}
                        </Text>
                      </View>
                      <Text style={styles.expandArrow}>{isExpanded ? '▲' : '▼'}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Expanded Card Details */}
                  {isExpanded && (
                    <View style={styles.cardDetails}>
                      <View style={styles.divider} />

                      {/* Weight Details */}
                      <Text style={styles.sectionTitle}>🚛 Vehicle Weight Details</Text>
                      <View style={styles.detailsRow}>
                        <Text style={styles.label}>Loaded Weight:</Text>
                        <Text style={styles.value}>{item.loaded_vehicle_weight} kg</Text>
                      </View>
                      <View style={styles.detailsRow}>
                        <Text style={styles.label}>Unloaded Weight:</Text>
                        <Text style={styles.value}>{item.unloaded_vehicle_weight} kg</Text>
                      </View>
                      <View style={styles.detailsRow}>
                        <Text style={styles.labelBold}>Actual Net Weight:</Text>
                        <Text style={styles.valueBold}>{item.actual_vehicle_weight} kg</Text>
                      </View>

                      {/* Vehicle Number */}
                      {item.vehicle_no && (
                        <View style={styles.detailsRow}>
                          <Text style={styles.label}>🚐 Vehicle No:</Text>
                          <Text style={styles.value}>{item.vehicle_no}</Text>
                        </View>
                      )}

                      {/* Dispatched Materials */}
                      <Text style={[styles.sectionTitle, { marginTop: 12 }]}>📦 Dispatched Materials</Text>
                      {item.items && item.items.length > 0 ? (
                        item.items.map((mat, idx) => (
                          <View key={idx} style={styles.itemRow}>
                            <Text style={styles.itemIndex}>{idx + 1}.</Text>
                            <Text style={styles.itemName}>{mat.material_name}</Text>
                            {mat.hsn && <Text style={styles.itemHsn}>[HSN: {mat.hsn}]</Text>}
                            <Text style={styles.itemQty}>{mat.quantity} {mat.unit || 'pcs'}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noItemsText}>No items specified.</Text>
                      )}

                      {/* Dispatched Object Images */}
                      <Text style={[styles.sectionTitle, { marginTop: 12 }]}>📸 Dispatched Object Images</Text>
                      {item.images && item.images.length > 0 ? (
                        <View style={styles.imageGrid}>
                          {item.images.map((img, idx) => (
                            <TouchableOpacity key={idx} onPress={() => handleViewImage(img.file_path)}>
                              <Image
                                source={{ uri: getApiUrl().replace('/api', '') + img.file_path }}
                                style={styles.imagePreview}
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.noItemsText}>No images uploaded.</Text>
                      )}

                      <View style={styles.divider} />

                      {/* Created By & Store Incharge & Accountant */}
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Sent By:</Text>
                        <Text style={styles.metaValue}>{item.creator_name}</Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Assigned to Store Incharge:</Text>
                        <Text style={styles.metaValue}>{item.store_incharge_name}</Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Text style={styles.metaLabel}>Challan to Accountant:</Text>
                        <Text style={styles.metaValue}>{item.accountant_name}</Text>
                      </View>

                      {/* Action Buttons */}
                      <View style={styles.actionContainer}>
                        {user.role === 'accountant' ? (
                          // Accountants can ONLY view - no upload capability
                          item.challan_file_path ? (
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.btnSuccess]}
                              onPress={() => handleViewChallan(item.challan_file_path)}
                            >
                              <Text style={styles.btnText}>📄 View Shared Challan</Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.actionBtn}>
                              <Text style={styles.disabledBtnText}>⏳ Challan Pending from Store Incharge</Text>
                            </View>
                          )
                        ) : (
                          // Non-accountants can upload/update
                          !isUploaded ? (
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.btnPrimary]}
                              onPress={() => openUploadModal(item)}
                            >
                              <Text style={styles.btnText}>📤 Upload & Share Challan</Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={{ gap: 10, width: '100%' }}>
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.btnSuccess]}
                                onPress={() => handleViewChallan(item.challan_file_path)}
                              >
                                <Text style={styles.btnText}>📄 View Signed Challan</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.btnSecondary]}
                                onPress={() => openUploadModal(item)}
                              >
                                <Text style={styles.btnText}>✉ Re-share / Update Challan</Text>
                              </TouchableOpacity>
                            </View>
                          )
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Upload Challan Modal - Only for non-accountants */}
      {uploadModalVisible && user.role !== 'accountant' && (
        <Modal
          visible={uploadModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setUploadModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Upload Job Work Challan</Text>
              {selectedRequest && (
                <Text style={styles.modalSubtitle}>Job ID: {selectedRequest.job_id}</Text>
              )}

              <Text style={styles.modalLabel}>Vendor Email Address (for email sharing)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="vendor@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={vendorEmail}
                onChangeText={setVendorEmail}
              />

              <Text style={[styles.modalLabel, { marginTop: 12 }]}>Select Signed Challan (PDF or Image) *</Text>
              <TouchableOpacity style={styles.filePickerBtn} onPress={handlePickDocument}>
                <Text style={styles.filePickerText}>
                  {challanFile ? `📄 ${challanFile.name}` : '📁 Choose File'}
                </Text>
              </TouchableOpacity>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => {
                    setUploadModalVisible(false);
                    setSelectedRequest(null);
                    setChallanFile(null);
                    setVendorEmail('');
                  }}
                  disabled={submitting}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.submitBtn]}
                  onPress={handleUploadSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.submitBtnText}>Upload & Share</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

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
    backgroundColor: '#28A745',
    padding: 20,
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
  card: {
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
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobIdText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  projectText: {
    fontSize: 13,
    color: '#3A3A3C',
    marginTop: 2,
  },
  typeText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeSuccess: {
    backgroundColor: '#E8F5E9',
  },
  badgeWarning: {
    backgroundColor: '#FFF3E0',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#28A745',
  },
  expandArrow: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 6,
  },
  cardDetails: {
    padding: 15,
    paddingTop: 0,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  label: {
    fontSize: 13,
    color: '#8E8E93',
  },
  value: {
    fontSize: 13,
    color: '#1C1C1E',
  },
  labelBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  valueBold: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28A745',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    backgroundColor: '#F8F9FA',
    padding: 6,
    borderRadius: 6,
  },
  itemIndex: {
    fontSize: 12,
    color: '#8E8E93',
    width: 20,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 2,
  },
  itemHsn: {
    fontSize: 11,
    color: '#8E8E93',
    marginHorizontal: 5,
  },
  itemQty: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1C1C1E',
    textAlign: 'right',
    flex: 1,
  },
  noItemsText: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  metaLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  metaValue: {
    fontSize: 12,
    color: '#3A3A3C',
    fontWeight: '500',
  },
  actionContainer: {
    marginTop: 15,
  },
  actionBtn: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: '#28A745',
  },
  btnSuccess: {
    backgroundColor: '#007AFF',
  },
  btnSecondary: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#28A745',
  },
  btnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  disabledBtnText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: 'bold',
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
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3A3A3C',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    color: '#1C1C1E',
  },
  filePickerBtn: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#28A745',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginVertical: 5,
  },
  filePickerText: {
    color: '#28A745',
    fontWeight: '600',
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
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
  submitBtn: {
    backgroundColor: '#28A745',
  },
  cancelBtnText: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  submitBtnText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
