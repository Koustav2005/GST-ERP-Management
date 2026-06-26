import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    Modal,
    TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { enquiriesAPI, usersAPI, getApiUrl } from '../config/api';
import Footer from '../components/Footer';
import Constants from 'expo-constants';

export default function EnquiryScreen({ route, navigation }) {
    const { user } = route.params;
    const [enquiries, setEnquiries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [npdModalVisible, setNpdModalVisible] = useState(false);
    const [npdUsers, setNpdUsers] = useState([]);
    const [selectedNpdUser, setSelectedNpdUser] = useState(null);
    const [currentEnquiry, setCurrentEnquiry] = useState(null);
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [reviewRemarks, setReviewRemarks] = useState('');
    const [reviewStatus, setReviewStatus] = useState(null);
    const [actionMenuVisible, setActionMenuVisible] = useState(false);
    const [customerModalVisible, setCustomerModalVisible] = useState(false);
    const [projectTypeModalVisible, setProjectTypeModalVisible] = useState(false);
    const [selectedProjectType, setSelectedProjectType] = useState('regular');
    const [poFile, setPoFile] = useState(null);
    const [customerRemarks, setCustomerRemarks] = useState('');

    useEffect(() => {
        fetchEnquiries();
    }, []);

    const fetchEnquiries = async () => {
        try {
            setLoading(true);
            console.log(`[DEBUG] Fetching enquiries for role: ${user.role}, ID: ${user.id}`);
            let response;
            if (user.role === 'npd') {
                response = await enquiriesAPI.getAssigned(user.id);
            } else {
                response = await enquiriesAPI.getByCompany(user.company_id);
            }
            console.log(`[DEBUG] Received ${response.data.enquiries?.length || 0} enquiries`);
            setEnquiries(response.data.enquiries || []);
        } catch (error) {
            console.error('Error fetching enquiries:', error);
            Alert.alert('Error', 'Failed to fetch enquiries');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (result.type === 'cancel' || result.canceled) {
                return;
            }

            const file = result.assets ? result.assets[0] : result;

            if (file) {
                uploadEnquiry(file);
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Error', 'Failed to pick document');
        }
    };

    const uploadEnquiry = async (file) => {
        try {
            setUploading(true);

            const formData = new FormData();
            formData.append('pdf', {
                uri: file.uri,
                type: 'application/pdf',
                name: file.name,
            });

            const response = await enquiriesAPI.upload(formData);

            Alert.alert(
                'Success',
                `Enquiry uploaded successfully!\nEnquiry Number: ${response.data.enquiry.enquiry_number}`,
                [{ text: 'OK', onPress: () => fetchEnquiries() }]
            );
        } catch (error) {
            console.error('Error uploading enquiry:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to upload enquiry');
        } finally {
            setUploading(false);
        }
    };

    const viewPDF = async (enquiry) => {
        try {
            const apiUrl = getApiUrl();
            const token = await AsyncStorage.getItem('token');
            const pdfUrl = `${apiUrl}/enquiries/${enquiry.id}/download${token ? `?token=${token}` : ''}`;

            console.log(`[DEBUG] Opening PDF in app: ${pdfUrl}`);
            await WebBrowser.openBrowserAsync(pdfUrl, {
                toolbarColor: '#667eea',
                enableBarCollapsing: true,
                showTitle: true,
            });

            // If NPD and status is 'sent_to_npd', mark as viewed
            if (user.role === 'npd' && (enquiry.status === 'sent_to_npd')) {
                try {
                    console.log(`[DEBUG] Marking enquiry ${enquiry.id} as viewed`);
                    await enquiriesAPI.markViewed(enquiry.id);
                    fetchEnquiries(); // Refresh to show 'viewed' status
                } catch (vError) {
                    console.error('Error marking viewed:', vError);
                }
            }
        } catch (error) {
            console.error('Error viewing PDF:', error);
            Alert.alert('Error', 'Failed to open PDF in app');
        }
    };

    const viewQuotation = async (enquiry) => {
        try {
            const apiUrl = getApiUrl();
            const token = await AsyncStorage.getItem('token');
            const pdfUrl = `${apiUrl}/enquiries/${enquiry.id}/download-quotation${token ? `?token=${token}` : ''}`;

            console.log(`[DEBUG] Opening Quotation in app: ${pdfUrl}`);
            await WebBrowser.openBrowserAsync(pdfUrl, {
                toolbarColor: '#28a745',
                enableBarCollapsing: true,
                showTitle: true,
            });
        } catch (error) {
            console.error('Error viewing quotation:', error);
            Alert.alert('Error', 'Failed to open quotation');
        }
    };

    const viewPO = async (enquiry) => {
        try {
            const apiUrl = getApiUrl();
            const token = await AsyncStorage.getItem('token');
            const pdfUrl = `${apiUrl}/enquiries/${enquiry.id}/download-po${token ? `?token=${token}` : ''}`;

            console.log(`[DEBUG] Opening PO in app: ${pdfUrl}`);
            await WebBrowser.openBrowserAsync(pdfUrl, {
                toolbarColor: '#1976d2',
                enableBarCollapsing: true,
                showTitle: true,
            });
        } catch (error) {
            console.error('Error viewing PO:', error);
            Alert.alert('Error', 'Failed to open PO');
        }
    };

    const pickQuotation = async (enquiry) => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (result.type === 'cancel' || result.canceled) {
                return;
            }

            const file = result.assets ? result.assets[0] : result;

            if (file) {
                Alert.alert(
                    'Upload Quotation',
                    `Do you want to upload ${file.name} as a quotation for enquiry ${enquiry.enquiry_number}?`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Upload', onPress: () => performQuotationUpload(file, enquiry) }
                    ]
                );
            }
        } catch (error) {
            console.error('Error picking quotation:', error);
            Alert.alert('Error', 'Failed to pick quotation');
        }
    };

    const performQuotationUpload = async (file, enquiry) => {
        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('quotation', {
                uri: file.uri,
                type: 'application/pdf',
                name: file.name,
            });

            await enquiriesAPI.uploadQuotation(enquiry.id, formData);
            Alert.alert('Success', 'Quotation uploaded successfully');
            fetchEnquiries();
        } catch (error) {
            console.error('Error uploading quotation:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to upload quotation');
        } finally {
            setUploading(false);
        }
    };

    const sendToNPD = async (enquiry) => {
        try {
            const response = await usersAPI.getCompanyEmployees(user.company_id);
            const npdUsersList = response.data.users.filter(u => u.role === 'npd');

            if (npdUsersList.length === 0) {
                Alert.alert('Error', 'No NPD users found in your company');
                return;
            }

            setNpdUsers(npdUsersList);
            setSelectedNpdUser(npdUsersList[0]?.id);
            console.log(`[DEBUG] Initialized modal: Enquiry ${enquiry.id}, First NPD User ID: ${npdUsersList[0]?.id}`);
            setCurrentEnquiry(enquiry);
            setNpdModalVisible(true);
        } catch (error) {
            console.error('Error fetching NPD users:', error);
            Alert.alert('Error', 'Failed to fetch NPD users');
        }
    };

    const confirmSendToNPD = async () => {
        if (!selectedNpdUser || !currentEnquiry) return;

        try {
            const response = await enquiriesAPI.sendToNPD(currentEnquiry.id, selectedNpdUser);
            Alert.alert('Success', response.data.message);
            setNpdModalVisible(false);
            setCurrentEnquiry(null);
            fetchEnquiries();
        } catch (error) {
            console.error('Error sending to NPD:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to send to NPD');
        }
    };

    const deleteEnquiry = async (enquiry) => {
        Alert.alert(
            'Delete Enquiry',
            `Are you sure you want to delete enquiry ${enquiry.enquiry_number}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await enquiriesAPI.delete(enquiry.id);
                            Alert.alert('Success', 'Enquiry deleted successfully');
                            fetchEnquiries();
                        } catch (error) {
                            console.error('Error deleting enquiry:', error);
                            Alert.alert('Error', 'Failed to delete enquiry');
                        }
                    },
                },
            ]
        );
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'pending': return '⏳ Pending';
            case 'sent_to_npd': return '📤 Assigned to NPD';
            case 'viewed': return '👀 Viewed by NPD';
            case 'quotation_uploaded': return '💰 Quotation Received';
            case 'completed': return '✅ Management Accepted';
            case 'rejected': return '❌ Management Rejected';
            case 'accepted_by_customer': return '🤝 Final Accept (Customer)';
            case 'rejected_by_customer': return '❌ Final Reject (Customer)';
            default: return status;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return '#FFA500';
            case 'sent_to_npd':
                return '#6F42C1';
            case 'viewed':
                return '#2196F3'; // Blue for viewed
            case 'quotation_uploaded':
                return '#28a745'; // Green for quotation
            case 'completed':
                return '#4CAF50';
            case 'rejected':
                return '#F44336';
            case 'accepted_by_customer':
                return '#2E7D32'; // Dark green
            case 'rejected_by_customer':
                return '#C62828'; // Dark red
            default:
                return '#9E9E9E';
        }
    };

    const handleReview = (enquiry, status) => {
        setCurrentEnquiry(enquiry);
        setReviewStatus(status);
        setReviewRemarks(''); // Reset remarks
        setReviewModalVisible(true);
    };

    const submitReview = async () => {
        if (!currentEnquiry || !reviewStatus) return;

        try {
            setLoading(true);
            await enquiriesAPI.reviewQuotation(currentEnquiry.id, reviewStatus, reviewRemarks);
            Alert.alert('Success', `Quotation ${reviewStatus === 'completed' ? 'accepted' : 'rejected'} successfully`);
            setReviewModalVisible(false);
            fetchEnquiries();
        } catch (error) {
            console.error('Error reviewing quotation:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to review quotation');
        } finally {
            setLoading(false);
        }
    };

    const shareQuotation = async (enquiry) => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('token');
            const apiUrl = await getApiUrl();
            const pdfUrl = `${apiUrl}/enquiries/${enquiry.id}/download-quotation${token ? `?token=${token}` : ''}`;

            const fileUri = `${FileSystem.cacheDirectory}${enquiry.enquiry_number}_Quotation.pdf`;

            const downloadRes = await FileSystem.downloadAsync(pdfUrl, fileUri);

            if (downloadRes.status !== 200) {
                throw new Error('Failed to download file for sharing');
            }

            if (!(await Sharing.isAvailableAsync())) {
                Alert.alert('Error', 'Sharing is not available on this device');
                return;
            }

            await Sharing.shareAsync(downloadRes.uri);
        } catch (error) {
            console.error('Error sharing quotation:', error);
            Alert.alert('Error', 'Failed to share quotation');
        } finally {
            setLoading(false);
        }
    };

    const openActionMenu = (enquiry) => {
        setCurrentEnquiry(enquiry);
        setActionMenuVisible(true);
    };

    const handleActionMenuOption = (option) => {
        setActionMenuVisible(false);
        if (option === 'view') {
            viewQuotation(currentEnquiry);
        } else if (option === 'accept') {
            handleReview(currentEnquiry, 'completed');
        } else if (option === 'reject') {
            handleReview(currentEnquiry, 'rejected');
        } else if (option === 'share') {
            shareQuotation(currentEnquiry);
        } else if (option === 'upload') {
            pickQuotation(currentEnquiry);
        } else if (option === 'customer_action') {
            setCustomerModalVisible(true);
        } else if (option === 'view_po') {
            viewPO(currentEnquiry);
        }
    };

    const pickPODocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (result.type === 'cancel' || result.canceled) {
                return;
            }

            const file = result.assets ? result.assets[0] : result;
            if (file) {
                setPoFile(file);
            }
        } catch (error) {
            console.error('Error picking PO document:', error);
            Alert.alert('Error', 'Failed to pick PO document');
        }
    };

    const handleCustomerAccepted = () => {
        setSelectedProjectType('regular');
        setProjectTypeModalVisible(true);
    };

    const submitCustomerAction = async (status, projectType = 'regular') => {
        try {
            setLoading(true);

            // 1. Upload PO if selected
            if (poFile) {
                const formData = new FormData();
                formData.append('po', {
                    uri: poFile.uri,
                    type: 'application/pdf',
                    name: poFile.name,
                });
                formData.append('project_type', projectType);
                await enquiriesAPI.uploadPO(currentEnquiry.id, formData);
            }

            // 2. Submit Final Decision
            await enquiriesAPI.customerReview(currentEnquiry.id, status, customerRemarks);

            Alert.alert('Success', `Customer decision recorded: ${status.replace(/_/g, ' ')}`);
            setCustomerModalVisible(false);
            setProjectTypeModalVisible(false);
            setSelectedProjectType('regular');
            setPoFile(null);
            setCustomerRemarks('');
            fetchEnquiries();
        } catch (error) {
            console.error('Error submitting customer action:', error);
            Alert.alert('Error', 'Failed to record customer action');
        } finally {
            setLoading(false);
        }
    };

    const confirmCustomerAccepted = () => {
        submitCustomerAction('accepted_by_customer', selectedProjectType);
    };

    const canEditDecision = (item) => {
        if (!item || !item.updated_at) return false;

        const updatedAt = new Date(item.updated_at);
        const now = new Date();
        const diffInMinutes = (now - updatedAt) / (1000 * 60);

        return diffInMinutes <= 5;
    };

    const renderEnquiryItem = ({ item }) => (
        <View style={styles.enquiryCard}>
            <View style={styles.enquiryHeader}>
                <View>
                    <Text style={styles.enquiryNumber}>{item.enquiry_number}</Text>
                    <Text style={styles.enquiryFilename}>{item.pdf_filename}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
                </View>
            </View>

            <View style={styles.enquiryDetails}>
                <Text style={styles.detailText}>
                    📅 {new Date(item.created_at).toLocaleDateString()}
                </Text>
                {item.uploaded_by_name && (
                    <Text style={styles.detailText}>👤 {item.uploaded_by_name}</Text>
                )}
                {item.notes && (
                    <View style={styles.remarksContainer}>
                        <Text style={styles.remarksLabel}>📝 Management Remarks:</Text>
                        <Text style={styles.remarksText}>{item.notes}</Text>
                    </View>
                )}
                {item.customer_remarks && (
                    <View style={[styles.remarksContainer, { borderLeftColor: '#2E7D32' }]}>
                        <Text style={[styles.remarksLabel, { color: '#2E7D32' }]}>🤝 Customer Remarks:</Text>
                        <Text style={styles.remarksText}>{item.customer_remarks}</Text>
                    </View>
                )}
                {item.po_filename && (
                    <View style={styles.poIndicator}>
                        <Text style={styles.poIndicatorText}>📄 Purchase Order Attached</Text>
                    </View>
                )}
            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.actionButton, styles.viewButton]}
                    onPress={() => viewPDF(item)}
                >
                    <Text style={styles.actionButtonText}>📄 View PDF</Text>
                </TouchableOpacity>

                {user.role === 'management' && item.status === 'pending' && (
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#6F42C1' }]}
                        onPress={() => sendToNPD(item)}
                    >
                        <Text style={styles.actionButtonText}>📤 Send to NPD</Text>
                    </TouchableOpacity>
                )}

                {(user.role === 'management' || user.role === 'npd') &&
                    (item.status === 'sent_to_npd' || item.status === 'viewed' || item.status === 'quotation_uploaded' || item.status === 'completed' || item.status === 'rejected' || item.status === 'accepted_by_customer' || item.status === 'rejected_by_customer') && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.quotationButton]}
                            onPress={() => openActionMenu(item)}
                        >
                            <Text style={styles.actionButtonText}>💰 Quotation</Text>
                        </TouchableOpacity>
                    )}
                {(user.role === 'management' || user.role === 'npd') &&
                    (item.status === 'completed' || item.status === 'accepted_by_customer' || item.status === 'rejected_by_customer') && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.customerActionButton]}
                            onPress={() => {
                                setCurrentEnquiry(item);
                                setCustomerModalVisible(true);
                            }}
                        >
                            <Text style={styles.actionButtonText}>🤝 Customer Action</Text>
                        </TouchableOpacity>
                    )}
                {user.role === 'management' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => deleteEnquiry(item)}
                    >
                        <Text style={styles.actionButtonText}>🗑️</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Enquiries</Text>
                <View style={{ width: 60 }} />
            </View>

            {user.role === 'management' && (
                <View style={styles.uploadSection}>
                    <TouchableOpacity
                        style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                        onPress={pickDocument}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.uploadButtonIcon}>📄</Text>
                                <Text style={styles.uploadButtonText}>Upload PDF Enquiry</Text>
                            </>
                        )}
                    </TouchableOpacity>
                    <Text style={styles.uploadHint}>
                        Upload a PDF file to create a new enquiry with auto-generated number
                    </Text>
                </View>
            )}

            <View style={styles.listSection}>
                <Text style={styles.sectionTitle}>Enquiries List</Text>
                {loading && enquiries.length === 0 ? (
                    <ActivityIndicator size="large" color="#667eea" style={styles.loader} />
                ) : enquiries.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateIcon}>📋</Text>
                        <Text style={styles.emptyStateText}>No enquiries yet</Text>
                        {user.role === 'management' ? (
                            <Text style={styles.emptyStateSubtext}>Upload a PDF to create your first enquiry</Text>
                        ) : (
                            <Text style={styles.emptyStateSubtext}>Enquiries assigned by management will appear here</Text>
                        )}
                    </View>
                ) : (
                    <>
                        <Text style={styles.debugText}>Count: {enquiries.length}</Text>
                        <FlatList
                            data={enquiries}
                            renderItem={renderEnquiryItem}
                            keyExtractor={(item) => item.id.toString()}
                            refreshControl={
                                <RefreshControl refreshing={refreshing} onRefresh={() => {
                                    setRefreshing(true);
                                    fetchEnquiries();
                                }} />
                            }
                            contentContainerStyle={styles.listContent}
                        />
                    </>
                )}
            </View>

            <Modal
                visible={actionMenuVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setActionMenuVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setActionMenuVisible(false)}
                >
                    <View style={styles.menuContent}>
                        <Text style={styles.menuTitle}>Quotation Actions</Text>
                        <Text style={styles.menuSubtitle}>{currentEnquiry?.enquiry_number}</Text>

                        {(currentEnquiry?.status === 'quotation_uploaded' || currentEnquiry?.status === 'completed' || currentEnquiry?.status === 'rejected' || currentEnquiry?.status === 'accepted_by_customer' || currentEnquiry?.status === 'rejected_by_customer') && (
                            <TouchableOpacity
                                style={styles.menuOption}
                                onPress={() => handleActionMenuOption('view')}
                            >
                                <Text style={styles.menuOptionText}>📄 View Quotation</Text>
                            </TouchableOpacity>
                        )}

                        {user.role === 'npd' && (currentEnquiry?.status === 'sent_to_npd' || currentEnquiry?.status === 'viewed' || currentEnquiry?.status === 'rejected') && (
                            <TouchableOpacity
                                style={[styles.menuOption, styles.uploadQuotationButton]}
                                onPress={() => handleActionMenuOption('upload')}
                            >
                                <Text style={styles.menuOptionText}>📤 {currentEnquiry?.status === 'rejected' ? 'Upload New Quotation' : 'Upload Quotation'}</Text>
                            </TouchableOpacity>
                        )}

                        {(currentEnquiry?.status === 'completed' || currentEnquiry?.status === 'accepted_by_customer') && (
                            <TouchableOpacity
                                style={[styles.menuOption, styles.shareOption]}
                                onPress={() => handleActionMenuOption('share')}
                            >
                                <Text style={styles.menuOptionText}>📤 Share Quotation</Text>
                            </TouchableOpacity>
                        )}

                        {currentEnquiry?.po_filename && (
                            <TouchableOpacity
                                style={[styles.menuOption, styles.poOption]}
                                onPress={() => handleActionMenuOption('view_po')}
                            >
                                <Text style={styles.menuOptionText}>📄 View Purchase Order</Text>
                            </TouchableOpacity>
                        )}


                        {user.role === 'management' && (currentEnquiry?.status === 'quotation_uploaded' || canEditDecision(currentEnquiry)) && (
                            <>
                                <TouchableOpacity
                                    style={[styles.menuOption, styles.acceptOption]}
                                    onPress={() => handleActionMenuOption('accept')}
                                >
                                    <Text style={styles.menuOptionText}>
                                        {currentEnquiry?.status === 'completed' ? '✅ Update Acceptance' : '✅ Accept Quotation'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.menuOption, styles.rejectOption]}
                                    onPress={() => handleActionMenuOption('reject')}
                                >
                                    <Text style={styles.menuOptionText}>
                                        {currentEnquiry?.status === 'rejected' ? '❌ Update Rejection' : '❌ Reject Quotation'}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}

                        <TouchableOpacity
                            style={[styles.menuOption, styles.cancelOption]}
                            onPress={() => setActionMenuVisible(false)}
                        >
                            <Text style={styles.cancelOptionText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal
                visible={npdModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setNpdModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select NPD User</Text>
                        <Text style={styles.modalSubtitle}>
                            Enquiry: {currentEnquiry?.enquiry_number}
                        </Text>

                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={selectedNpdUser}
                                onValueChange={(itemValue) => setSelectedNpdUser(itemValue)}
                                style={styles.picker}
                            >
                                {npdUsers.map((npdUser) => (
                                    <Picker.Item
                                        key={npdUser.id}
                                        label={npdUser.name}
                                        value={npdUser.id}
                                    />
                                ))}
                            </Picker>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setNpdModalVisible(false)}
                            >
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={confirmSendToNPD}
                            >
                                <Text style={styles.modalButtonText}>Send</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={reviewModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setReviewModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {reviewStatus === 'completed' ? 'Accept Quotation' : 'Reject Quotation'}
                        </Text>
                        <Text style={styles.modalSubtitle}>
                            Enquiry: {currentEnquiry?.enquiry_number}
                        </Text>

                        <Text style={styles.inputLabel}>Remarks (Optional):</Text>
                        <TextInput
                            style={styles.remarksInput}
                            multiline
                            numberOfLines={4}
                            placeholder="Enter any feedback or remarks..."
                            value={reviewRemarks}
                            onChangeText={setReviewRemarks}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setReviewModalVisible(false)}
                            >
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    reviewStatus === 'completed' ? styles.confirmButton : styles.rejectModalButton
                                ]}
                                onPress={submitReview}
                            >
                                <Text style={styles.modalButtonText}>
                                    {reviewStatus === 'completed' ? 'Confirm Accept' : 'Confirm Reject'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Customer Action Modal */}
            <Modal
                visible={customerModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setCustomerModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView contentContainerStyle={{ padding: 20 }}>
                            <Text style={styles.modalTitle}>🤝 Customer Action</Text>
                            <Text style={styles.modalSubtitle}>Enquiry: {currentEnquiry?.enquiry_number}</Text>

                            <View style={styles.customerActionNotice}>
                                <Text style={styles.noticeText}>
                                    Use this to record the customer's final decision and upload their Purchase Order (PO).
                                </Text>
                            </View>

                            <Text style={styles.label}>Purchase Order (Optional PDF):</Text>
                            <TouchableOpacity
                                style={[styles.uploadBox, poFile && styles.uploadBoxSelected]}
                                onPress={pickPODocument}
                            >
                                <Text style={styles.uploadBoxText}>
                                    {poFile ? `📄 ${poFile.name}` : '📁 Select PO PDF'}
                                </Text>
                            </TouchableOpacity>

                            <Text style={styles.label}>Final Remarks:</Text>
                            <TextInput
                                style={styles.remarksInput}
                                placeholder="Enter customer feedback or remarks..."
                                value={customerRemarks}
                                onChangeText={setCustomerRemarks}
                                multiline
                                numberOfLines={4}
                            />

                            <View style={styles.customerActionButtons}>
                                <TouchableOpacity
                                    style={[styles.decisionButton, styles.acceptDecision]}
                                    onPress={handleCustomerAccepted}
                                    disabled={loading}
                                >
                                    {loading ? <ActivityIndicator color="#fff" /> : (
                                        <Text style={styles.decisionButtonText}>✅ Customer Accepted</Text>
                                    )}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.decisionButton, styles.rejectDecision]}
                                    onPress={() => submitCustomerAction('rejected_by_customer')}
                                    disabled={loading}
                                >
                                    <Text style={styles.decisionButtonText}>❌ Customer Rejected</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={() => setCustomerModalVisible(false)}
                                >
                                    <Text style={styles.closeButtonText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Project Type Selection Modal */}
            <Modal
                visible={projectTypeModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setProjectTypeModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Choose Work Type</Text>
                        <Text style={styles.modalSubtitle}>Enquiry: {currentEnquiry?.enquiry_number}</Text>

                        <TouchableOpacity
                            style={[
                                styles.projectTypeOption,
                                selectedProjectType === 'regular' && styles.projectTypeOptionSelected
                            ]}
                            onPress={() => setSelectedProjectType('regular')}
                        >
                            <Text style={styles.projectTypeTitle}>Regular Project</Text>
                            <Text style={styles.projectTypeDescription}>Use the normal project workflow.</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.projectTypeOption,
                                selectedProjectType === 'external_job_work' && styles.projectTypeOptionSelected
                            ]}
                            onPress={() => setSelectedProjectType('external_job_work')}
                        >
                            <Text style={styles.projectTypeTitle}>External Job Work</Text>
                            <Text style={styles.projectTypeDescription}>Fabrication work for another company with the same workflow.</Text>
                        </TouchableOpacity>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setProjectTypeModalVisible(false)}
                                disabled={loading}
                            >
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmButton]}
                                onPress={confirmCustomerAccepted}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="#fff" /> : (
                                    <Text style={styles.modalButtonText}>Continue</Text>
                                )}
                            </TouchableOpacity>
                        </View>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#667eea',
        paddingTop: 50,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    uploadSection: {
        padding: 20,
        backgroundColor: '#fff',
        marginBottom: 10,
    },
    uploadButton: {
        backgroundColor: '#667eea',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    uploadButtonDisabled: {
        backgroundColor: '#9ca3db',
    },
    uploadButtonIcon: {
        fontSize: 24,
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    uploadHint: {
        marginTop: 10,
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    listSection: {
        flex: 1,
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
    },
    loader: {
        marginTop: 50,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyStateIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    listContent: {
        paddingBottom: 20,
    },
    enquiryCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    enquiryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    enquiryNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#667eea',
        marginBottom: 4,
    },
    enquiryFilename: {
        fontSize: 14,
        color: '#666',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    enquiryDetails: {
        marginBottom: 12,
    },
    detailText: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    viewButton: {
        backgroundColor: '#2196F3',
    },
    sendButton: {
        backgroundColor: '#FF9800',
    },
    deleteButton: {
        backgroundColor: '#F44336',
        flex: 0.5,
    },
    quotationButton: {
        backgroundColor: '#28a745',
    },
    uploadQuotationButton: {
        backgroundColor: '#28a745',
    },
    acceptButton: {
        backgroundColor: '#28a745',
    },
    rejectButton: {
        backgroundColor: '#F44336',
    },
    rejectModalButton: {
        backgroundColor: '#F44336',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    remarksInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        height: 100,
        textAlignVertical: 'top',
        marginBottom: 20,
        fontSize: 14,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '85%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginBottom: 20,
    },
    picker: {
        height: 50,
    },
    projectTypeOption: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 14,
        marginBottom: 12,
        backgroundColor: '#fff',
    },
    projectTypeOptionSelected: {
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.08)',
    },
    projectTypeTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    projectTypeDescription: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#999',
    },
    confirmButton: {
        backgroundColor: '#667eea',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    debugText: {
        fontSize: 10,
        color: '#ccc',
        textAlign: 'right',
        marginBottom: 4,
    },
    remarksContainer: {
        marginTop: 8,
        padding: 8,
        backgroundColor: '#f8f9fa',
        borderRadius: 6,
        borderLeftWidth: 3,
        borderLeftColor: '#667eea',
    },
    remarksLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#444',
        marginBottom: 2,
    },
    remarksText: {
        fontSize: 13,
        color: '#555',
        fontStyle: 'italic',
    },
    poIndicator: {
        marginTop: 8,
        backgroundColor: '#e3f2fd',
        padding: 6,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    poIndicatorText: {
        fontSize: 11,
        color: '#1976d2',
        fontWeight: 'bold',
    },
    menuContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        width: '80%',
        maxWidth: 300,
        alignItems: 'center',
    },
    menuTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#333',
    },
    menuSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
    },
    menuOption: {
        width: '100%',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    menuOptionText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    acceptOption: {
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
    },
    shareOption: {
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
    },
    poOption: {
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
    },
    rejectOption: {
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        borderBottomWidth: 0,
    },
    cancelOption: {
        marginTop: 10,
        borderBottomWidth: 0,
    },
    cancelOptionText: {
        fontSize: 16,
        color: '#999',
        fontWeight: '600',
    },
    uploadBox: {
        borderWidth: 2,
        borderColor: '#667eea',
        borderStyle: 'dashed',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(102, 126, 234, 0.05)',
        marginBottom: 15,
    },
    uploadBoxSelected: {
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderStyle: 'solid',
    },
    uploadBoxText: {
        color: '#667eea',
        fontSize: 14,
        fontWeight: '600',
    },
    customerActionNotice: {
        backgroundColor: '#e3f2fd',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
    },
    noticeText: {
        fontSize: 13,
        color: '#1976d2',
        lineHeight: 18,
    },
    customerActionButtons: {
        gap: 10,
        marginTop: 10,
    },
    decisionButton: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    acceptDecision: {
        backgroundColor: '#2E7D32',
    },
    rejectDecision: {
        backgroundColor: '#C62828',
    },
    decisionButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    customerActionButton: {
        backgroundColor: '#1976d2',
    },
    closeButton: {
        padding: 14,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#666',
        fontSize: 15,
        fontWeight: '600',
    },
});
