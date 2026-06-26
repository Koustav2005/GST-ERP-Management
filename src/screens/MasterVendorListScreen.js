import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { masterVendorsAPI } from '../config/api';
import Footer from '../components/Footer';

export default function MasterVendorListScreen({ navigation }) {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [editingVendor, setEditingVendor] = useState(null);
    const [expandedVendorId, setExpandedVendorId] = useState(null);
    const [activeFilter, setActiveFilter] = useState('All');

    // Form state for single vendor
    const [formData, setFormData] = useState({
        name: '',
        vendor_type: 'Sundry Creditors',
        gst_number: '',
        pan_number: '',
        opening_balance: '',
        credit_period: '',
        currency: 'INR',
        address: '',
        state: '',
        country: '',
        pincode: '',
        phone_number: '',
        email: '',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        branch_name: '',
        account_holder_name: '',
        upi_id: ''
    });

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        setLoading(true);
        try {
            const response = await masterVendorsAPI.getAll();
            setVendors(response.data);
        } catch (error) {
            console.error('Error fetching vendors:', error);
            Alert.alert('Error', 'Failed to load vendors');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name.trim()) {
            Alert.alert('Error', 'Vendor Name is required');
            return;
        }

        try {
            const payload = {
                ...formData,
                name: formData.name.trim(),
                email: formData.email.trim(),
                phone_number: formData.phone_number.trim(),
                address: formData.address.trim()
            };

            if (editingVendor) {
                await masterVendorsAPI.update(editingVendor.id, payload);
            } else {
                await masterVendorsAPI.create(payload);
            }

            setModalVisible(false);
            resetForm();
            fetchVendors();
            Alert.alert('Success', `Vendor ${editingVendor ? 'updated' : 'added'} successfully`);
        } catch (error) {
            console.error('Error saving vendor:', error);
            const errorMsg = error.response?.data?.error || 'Failed to save vendor';
            Alert.alert('Error', errorMsg);
        }
    };

    const handleDelete = (id) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this vendor?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await masterVendorsAPI.delete(id);
                            fetchVendors();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete vendor');
                        }
                    }
                }
            ]
        );
    };

    const openEditModal = (vendor) => {
        setEditingVendor(vendor);
        setFormData({
            name: vendor.name || '',
            vendor_type: vendor.vendor_type || 'Sundry Creditors',
            gst_number: vendor.gst_number || '',
            pan_number: vendor.pan_number || '',
            opening_balance: vendor.opening_balance !== null && vendor.opening_balance !== undefined ? vendor.opening_balance.toString() : '',
            credit_period: vendor.credit_period || '',
            currency: vendor.currency || 'INR',
            address: vendor.address || '',
            state: vendor.state || '',
            country: vendor.country || '',
            pincode: vendor.pincode || '',
            phone_number: vendor.phone_number || '',
            email: vendor.email || '',
            bank_name: vendor.bank_name || '',
            account_number: vendor.account_number || '',
            ifsc_code: vendor.ifsc_code || '',
            branch_name: vendor.branch_name || '',
            account_holder_name: vendor.account_holder_name || '',
            upi_id: vendor.upi_id || ''
        });
        setModalVisible(true);
    };

    const resetForm = () => {
        setEditingVendor(null);
        setFormData({
            name: '',
            vendor_type: 'Sundry Creditors',
            gst_number: '',
            pan_number: '',
            opening_balance: '',
            credit_period: '',
            currency: 'INR',
            address: '',
            state: '',
            country: '',
            pincode: '',
            phone_number: '',
            email: '',
            bank_name: '',
            account_number: '',
            ifsc_code: '',
            branch_name: '',
            account_holder_name: '',
            upi_id: ''
        });
    };

    const toggleExpandCard = (id) => {
        setExpandedVendorId(expandedVendorId === id ? null : id);
    };

    const getVendorTypeStyle = (type) => {
        switch (type) {
            case 'Sundry Creditors':
                return { container: styles.badgeCreditors, text: styles.textCreditors };
            case 'Sundry Debtors':
                return { container: styles.badgeDebtors, text: styles.textDebtors };
            case 'Immediate Vendor':
                return { container: styles.badgeImmediate, text: styles.textImmediate };
            default:
                return { container: styles.badgeDefault, text: styles.textDefault };
        }
    };

    const filteredVendors = vendors.filter(v => {
        const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (v.email && v.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (v.phone_number && v.phone_number.includes(searchQuery)) ||
            (v.gst_number && v.gst_number.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;

        if (activeFilter === 'All') return true;

        const vendorType = v.vendor_type || 'Sundry Creditors';
        if (activeFilter === 'Creditors') {
            return vendorType === 'Sundry Creditors';
        }
        if (activeFilter === 'Debtors') {
            return vendorType === 'Sundry Debtors';
        }
        if (activeFilter === 'Immediate Vendor') {
            return vendorType === 'Immediate Vendor';
        }
        return true;
    });

    const renderVendorItem = ({ item }) => {
        const isExpanded = expandedVendorId === item.id;
        const typeStyles = getVendorTypeStyle(item.vendor_type);

        return (
            <View style={styles.vendorCard}>
                <TouchableOpacity
                    onPress={() => toggleExpandCard(item.id)}
                    style={styles.cardHeaderPress}
                    activeOpacity={0.7}
                >
                    <View style={styles.cardHeaderTop}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.vendorName}>🏪 {item.name}</Text>
                        </View>
                        <View style={[styles.badge, typeStyles.container]}>
                            <Text style={[styles.badgeText, typeStyles.text]}>
                                {item.vendor_type || 'Sundry Creditors'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.cardHeaderInfo}>
                        {item.gst_number ? (
                            <Text style={styles.quickInfo}>GST: <Text style={styles.boldText}>{item.gst_number}</Text></Text>
                        ) : null}
                        {item.phone_number ? (
                            <Text style={styles.quickInfo}>📞 {item.phone_number}</Text>
                        ) : null}
                    </View>

                    <View style={styles.expandToggleRow}>
                        <Text style={styles.expandToggleText}>
                            {isExpanded ? 'Hide Details ▲' : 'Show Full Details ▼'}
                        </Text>
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.expandedContent}>
                        <View style={styles.sectionDivider} />

                        {/* General info details */}
                        <View style={styles.detailSection}>
                            <Text style={styles.sectionTitle}>Financial Info</Text>
                            <View style={styles.gridContainer}>
                                <View style={styles.gridItem}>
                                    <Text style={styles.detailLabel}>PAN Number</Text>
                                    <Text style={styles.detailValue}>{item.pan_number || '-'}</Text>
                                </View>
                                <View style={styles.gridItem}>
                                    <Text style={styles.detailLabel}>Opening Balance</Text>
                                    <Text style={styles.detailValue}>
                                        {item.currency || 'INR'} {item.opening_balance ? parseFloat(item.opening_balance).toLocaleString('en-IN') : '0.00'}
                                    </Text>
                                </View>
                                <View style={styles.gridItem}>
                                    <Text style={styles.detailLabel}>Credit Period</Text>
                                    <Text style={styles.detailValue}>{item.credit_period || '-'}</Text>
                                </View>
                                <View style={styles.gridItem}>
                                    <Text style={styles.detailLabel}>Currency</Text>
                                    <Text style={styles.detailValue}>{item.currency || 'INR'}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Address Details */}
                        <View style={styles.detailSection}>
                            <Text style={styles.sectionTitle}>Address Details</Text>
                            <View style={styles.addressContainer}>
                                <Text style={styles.detailLabel}>Address</Text>
                                <Text style={styles.detailValueAddress}>{item.address || '-'}</Text>
                            </View>
                            <View style={styles.gridContainer}>
                                <View style={styles.gridItem}>
                                    <Text style={styles.detailLabel}>State</Text>
                                    <Text style={styles.detailValue}>{item.state || '-'}</Text>
                                </View>
                                <View style={styles.gridItem}>
                                    <Text style={styles.detailLabel}>Country</Text>
                                    <Text style={styles.detailValue}>{item.country || '-'}</Text>
                                </View>
                                <View style={styles.gridItem}>
                                    <Text style={styles.detailLabel}>Pincode</Text>
                                    <Text style={styles.detailValue}>{item.pincode || '-'}</Text>
                                </View>
                                <View style={styles.gridItem}>
                                    <Text style={styles.detailLabel}>Email ID</Text>
                                    <Text style={styles.detailValue} numberOfLines={1}>{item.email || '-'}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Bank Details */}
                        <View style={styles.detailSection}>
                            <Text style={styles.sectionTitle}>Bank Details</Text>
                            <View style={styles.gridContainer}>
                                <View style={styles.gridItem}>
                                    <Text style={styles.detailLabel}>Bank Name</Text>
                                    <Text style={styles.detailValue}>{item.bank_name || '-'}</Text>
                                </View>
                                <View style={styles.gridItem}>
                                    <Text style={styles.detailLabel}>Account Number</Text>
                                    <Text style={styles.detailValue}>{item.account_number || '-'}</Text>
                                </View>
                                <View style={styles.gridItem}>
                                    <Text style={styles.detailLabel}>IFSC Code</Text>
                                    <Text style={styles.detailValue}>{item.ifsc_code || '-'}</Text>
                                </View>
                                <View style={styles.gridItem}>
                                    <Text style={styles.detailLabel}>Branch Name</Text>
                                    <Text style={styles.detailValue}>{item.branch_name || '-'}</Text>
                                </View>
                                <View style={styles.gridItemLong}>
                                    <Text style={styles.detailLabel}>Account Holder</Text>
                                    <Text style={styles.detailValue}>{item.account_holder_name || '-'}</Text>
                                </View>
                                <View style={styles.gridItemLong}>
                                    <Text style={styles.detailLabel}>UPI ID (optional)</Text>
                                    <Text style={styles.detailValue}>{item.upi_id || '-'}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Actions */}
                        <View style={styles.actions}>
                            <TouchableOpacity onPress={() => openEditModal(item)} style={styles.editButton}>
                                <Text style={styles.buttonText}>Edit Details</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                                <Text style={styles.deleteButtonText}>Delete Vendor</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Master Vendor List</Text>
            </View>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name, GSTIN, email or phone..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <View style={styles.filterOuterContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterContainer}
                >
                    {['All', 'Creditors', 'Debtors', 'Immediate Vendor'].map((filter) => (
                        <TouchableOpacity
                            key={filter}
                            style={[
                                styles.filterButton,
                                activeFilter === filter && styles.activeFilterButton
                            ]}
                            onPress={() => setActiveFilter(filter)}
                        >
                            <Text
                                style={[
                                    styles.filterButtonText,
                                    activeFilter === filter && styles.activeFilterButtonText
                                ]}
                            >
                                {filter}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#28A745" style={styles.loader} />
            ) : (
                <FlatList
                    data={filteredVendors}
                    renderItem={renderVendorItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No vendors found.</Text>
                    }
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                    resetForm();
                    setModalVisible(true);
                }}
            >
                <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {editingVendor ? 'Edit Master Vendor' : 'Add New Vendor'}
                        </Text>

                        <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
                            {/* General Details Group */}
                            <View style={styles.formGroupCard}>
                                <Text style={styles.formGroupTitle}>1. Primary Information</Text>

                                <Text style={styles.label}>Vendor Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.name}
                                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                                    placeholder="Enter company/vendor name"
                                />

                                <Text style={styles.label}>Type of Vendor</Text>
                                <View style={styles.pickerContainer}>
                                    <Picker
                                        selectedValue={formData.vendor_type}
                                        onValueChange={(itemValue) => setFormData({ ...formData, vendor_type: itemValue })}
                                        style={styles.picker}
                                    >
                                        <Picker.Item label="Sundry Creditors" value="Sundry Creditors" />
                                        <Picker.Item label="Sundry Debtors" value="Sundry Debtors" />
                                        <Picker.Item label="Immediate Vendor" value="Immediate Vendor" />
                                    </Picker>
                                </View>

                                <View style={styles.row}>
                                    <View style={styles.flex1}>
                                        <Text style={styles.label}>GST Number</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={formData.gst_number}
                                            onChangeText={(text) => setFormData({ ...formData, gst_number: text.toUpperCase() })}
                                            placeholder="15-digit GSTIN"
                                            autoCapitalize="characters"
                                            maxLength={15}
                                        />
                                    </View>
                                    <View style={styles.flex1}>
                                        <Text style={styles.label}>PAN Number</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={formData.pan_number}
                                            onChangeText={(text) => setFormData({ ...formData, pan_number: text.toUpperCase() })}
                                            placeholder="10-digit PAN"
                                            autoCapitalize="characters"
                                            maxLength={10}
                                        />
                                    </View>
                                </View>

                                <View style={styles.row}>
                                    <View style={styles.flex1}>
                                        <Text style={styles.label}>Opening Balance</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={formData.opening_balance}
                                            onChangeText={(text) => setFormData({ ...formData, opening_balance: text })}
                                            placeholder="e.g. 50000"
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={styles.flex1}>
                                        <Text style={styles.label}>Credit Period</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={formData.credit_period}
                                            onChangeText={(text) => setFormData({ ...formData, credit_period: text })}
                                            placeholder="e.g. 30 Days"
                                        />
                                    </View>
                                </View>

                                <Text style={styles.label}>Currency</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.currency}
                                    onChangeText={(text) => setFormData({ ...formData, currency: text })}
                                    placeholder="INR"
                                />
                            </View>

                            {/* Address Details Group */}
                            <View style={styles.formGroupCard}>
                                <Text style={styles.formGroupTitle}>2. Address Details</Text>

                                <Text style={styles.label}>Address</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={formData.address}
                                    onChangeText={(text) => setFormData({ ...formData, address: text })}
                                    placeholder="Enter street, office/building address"
                                    multiline
                                    numberOfLines={2}
                                />

                                <View style={styles.row}>
                                    <View style={styles.flex1}>
                                        <Text style={styles.label}>State</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={formData.state}
                                            onChangeText={(text) => setFormData({ ...formData, state: text })}
                                            placeholder="State"
                                        />
                                    </View>
                                    <View style={styles.flex1}>
                                        <Text style={styles.label}>Country</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={formData.country}
                                            onChangeText={(text) => setFormData({ ...formData, country: text })}
                                            placeholder="Country"
                                        />
                                    </View>
                                </View>

                                <View style={styles.row}>
                                    <View style={styles.flex1}>
                                        <Text style={styles.label}>Pincode</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={formData.pincode}
                                            onChangeText={(text) => setFormData({ ...formData, pincode: text })}
                                            placeholder="Pincode"
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={styles.flex1}>
                                        <Text style={styles.label}>Phn Number</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={formData.phone_number}
                                            onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
                                            placeholder="Phone number"
                                            keyboardType="phone-pad"
                                        />
                                    </View>
                                </View>

                                <Text style={styles.label}>Email ID</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.email}
                                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                                    placeholder="Email address"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            {/* Bank Details Group */}
                            <View style={styles.formGroupCard}>
                                <Text style={styles.formGroupTitle}>3. Bank Details</Text>

                                <Text style={styles.label}>Bank Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.bank_name}
                                    onChangeText={(text) => setFormData({ ...formData, bank_name: text })}
                                    placeholder="Enter bank name"
                                />

                                <View style={styles.row}>
                                    <View style={styles.flex1}>
                                        <Text style={styles.label}>Account No.</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={formData.account_number}
                                            onChangeText={(text) => setFormData({ ...formData, account_number: text })}
                                            placeholder="Account number"
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={styles.flex1}>
                                        <Text style={styles.label}>IFSC Code</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={formData.ifsc_code}
                                            onChangeText={(text) => setFormData({ ...formData, ifsc_code: text.toUpperCase() })}
                                            placeholder="IFSC code"
                                            autoCapitalize="characters"
                                        />
                                    </View>
                                </View>

                                <Text style={styles.label}>Branch Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.branch_name}
                                    onChangeText={(text) => setFormData({ ...formData, branch_name: text })}
                                    placeholder="Branch name"
                                />

                                <Text style={styles.label}>Account Holder Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.account_holder_name}
                                    onChangeText={(text) => setFormData({ ...formData, account_holder_name: text })}
                                    placeholder="Name in bank account"
                                />

                                <Text style={styles.label}>UPI ID (optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={formData.upi_id}
                                    onChangeText={(text) => setFormData({ ...formData, upi_id: text })}
                                    placeholder="upi@bankname"
                                    autoCapitalize="none"
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleSave}
                            >
                                <Text style={styles.buttonText}>Save Details</Text>
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
        backgroundColor: '#f5f7fb',
    },
    header: {
        backgroundColor: '#28A745',
        padding: 20,
        paddingTop: 50,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 15,
    },
    backText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    searchContainer: {
        padding: 15,
        backgroundColor: 'white',
    },
    searchInput: {
        backgroundColor: '#f0f4f8',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 8,
        fontSize: 15,
        color: '#333',
    },
    filterOuterContainer: {
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eef2f6',
        paddingBottom: 10,
    },
    filterContainer: {
        paddingHorizontal: 15,
        flexDirection: 'row',
        gap: 8,
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f0f4f8',
        borderWidth: 1,
        borderColor: '#eef2f6',
    },
    activeFilterButton: {
        backgroundColor: '#28A745',
        borderColor: '#28A745',
    },
    filterButtonText: {
        fontSize: 13,
        color: '#555',
        fontWeight: '600',
    },
    activeFilterButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    loader: {
        marginTop: 50,
    },
    listContent: {
        padding: 15,
        paddingBottom: 100,
    },
    vendorCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#1a3b5c',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#eef2f6',
    },
    cardHeaderPress: {
        padding: 16,
    },
    cardHeaderTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    vendorName: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#1a335e',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    badgeCreditors: {
        backgroundColor: '#e8f4fd',
    },
    textCreditors: {
        color: '#007BFF',
    },
    badgeDebtors: {
        backgroundColor: '#f3e8ff',
    },
    textDebtors: {
        color: '#7d3c98',
    },
    badgeImmediate: {
        backgroundColor: '#ebfdf0',
    },
    textImmediate: {
        color: '#28a745',
    },
    badgeDefault: {
        backgroundColor: '#f1f3f5',
    },
    textDefault: {
        color: '#6c757d',
    },
    cardHeaderInfo: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 8,
    },
    quickInfo: {
        fontSize: 13,
        color: '#666',
    },
    boldText: {
        fontWeight: '600',
        color: '#333',
    },
    expandToggleRow: {
        alignItems: 'center',
        marginTop: 4,
    },
    expandToggleText: {
        fontSize: 12,
        color: '#28A745',
        fontWeight: '600',
    },
    expandedContent: {
        backgroundColor: '#fafbfc',
    },
    sectionDivider: {
        height: 1,
        backgroundColor: '#eef2f6',
    },
    detailSection: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f4f8',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#28A745',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    gridItem: {
        width: '47%',
        marginBottom: 8,
    },
    gridItemLong: {
        width: '100%',
        marginBottom: 8,
    },
    addressContainer: {
        marginBottom: 10,
    },
    detailLabel: {
        fontSize: 11,
        color: '#8a94a6',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    detailValue: {
        fontSize: 14,
        color: '#2d3748',
        fontWeight: '500',
    },
    detailValueAddress: {
        fontSize: 14,
        color: '#2d3748',
        fontWeight: '500',
        lineHeight: 20,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        padding: 16,
        backgroundColor: '#fff',
    },
    editButton: {
        flex: 1,
        backgroundColor: '#e7f3ef',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#28A745',
    },
    deleteButton: {
        flex: 1,
        backgroundColor: '#fff5f5',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DC3545',
    },
    buttonText: {
        color: '#28A745',
        fontSize: 13,
        fontWeight: 'bold',
    },
    deleteButtonText: {
        color: '#DC3545',
        fontSize: 13,
        fontWeight: 'bold',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: '#999',
        fontSize: 15,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 80,
        backgroundColor: '#28A745',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    fabText: {
        color: 'white',
        fontSize: 30,
        fontWeight: '300',
        marginTop: -3,
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
        maxHeight: '92%',
    },
    modalTitle: {
        fontSize: 19,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#1a335e',
    },
    formScroll: {
        marginBottom: 15,
    },
    formGroupCard: {
        backgroundColor: '#fafbfc',
        borderRadius: 12,
        padding: 16,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#ebf0f5',
    },
    formGroupTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#28A745',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eef2f6',
        paddingBottom: 6,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4a5568',
        marginBottom: 4,
        marginTop: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#cbd5e0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 14,
        backgroundColor: 'white',
        color: '#2d3748',
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#cbd5e0',
        borderRadius: 8,
        backgroundColor: 'white',
        marginBottom: 4,
        overflow: 'hidden',
        justifyContent: 'center',
        height: 42,
    },
    picker: {
        width: '100%',
        color: '#2d3748',
    },
    textArea: {
        height: 54,
        textAlignVertical: 'top',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    flex1: {
        flex: 1,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 10,
    },
    modalButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#edf2f7',
    },
    saveButton: {
        backgroundColor: '#edf2f7',
        color: '#0bda0bff,'
    },
});
