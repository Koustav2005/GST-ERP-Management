import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
    Modal,
    Linking,
    FlatList
} from 'react-native';
import { masterMaterialsAPI, masterVendorsAPI, purchaseOrdersAPI, companiesAPI } from '../config/api';
import * as MailComposer from 'expo-mail-composer';
import Footer from '../components/Footer';

export default function CreatePOScreen({ route, navigation }) {
    const { user } = route.params;
    const [vendors, setVendors] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [companyInfo, setCompanyInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    // Selection state
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [vendorModalVisible, setVendorModalVisible] = useState(false);

    // PO Items state
    const [items, setItems] = useState([
        {
            material_name: '',
            hsn: '',
            quantity: '',
            unit: '',
            unit_price: '',
            gst_rate: '',
            total_price: 0,
            suggestions: [],
            showSuggestions: false
        }
    ]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [vendorsRes, materialsRes, companyRes] = await Promise.all([
                masterVendorsAPI.getAll(),
                masterMaterialsAPI.getAll(),
                companiesAPI.getById(user.company_id)
            ]);
            setVendors(vendorsRes.data);
            setMaterials(materialsRes.data);
            setCompanyInfo(companyRes.data.company);
        } catch (error) {
            console.error('Error fetching data:', error);
            Alert.alert('Error', 'Failed to load vendors or materials');
        } finally {
            setLoading(false);
        }
    };

    const handleVendorSelect = (vendor) => {
        setSelectedVendor(vendor);
        setVendorModalVisible(false);
    };

    const handleMaterialInputChange = (index, text) => {
        const newItems = [...items];
        newItems[index].material_name = text;

        if (text.length > 1) {
            const filtered = materials.filter(m =>
                m.material_name.toLowerCase().includes(text.toLowerCase())
            );
            newItems[index].suggestions = filtered;
            newItems[index].showSuggestions = true;
        } else {
            newItems[index].showSuggestions = false;
        }

        setItems(newItems);
    };

    const selectMaterial = (index, material) => {
        const newItems = [...items];
        newItems[index] = {
            ...newItems[index],
            material_name: material.material_name,
            hsn: material.hsn_code || '',
            showSuggestions: false
        };
        setItems(newItems);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        if (field === 'quantity' || field === 'unit_price' || field === 'gst_rate') {
            calculateItemTotal(index, newItems);
        } else {
            setItems(newItems);
        }
    };

    const calculateItemTotal = (index, currentItems) => {
        const item = currentItems[index];
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;
        const gst = parseFloat(item.gst_rate) || 0;

        const baseTotal = qty * price;
        item.total_price = baseTotal + (baseTotal * gst / 100);
        setItems(currentItems);
    };

    const addRow = () => {
        setItems([...items, {
            material_name: '',
            hsn: '',
            quantity: '',
            unit: '',
            unit_price: '',
            gst_rate: '',
            total_price: 0,
            suggestions: [],
            showSuggestions: false
        }]);
    };

    const removeRow = (index) => {
        if (items.length > 1) {
            const newItems = [...items];
            newItems.splice(index, 1);
            setItems(newItems);
        }
    };

    const calculateGrandTotal = () => {
        return items.reduce((sum, item) => sum + (item.total_price || 0), 0);
    };

    const handleSaveAndShare = async () => {
        if (!selectedVendor) {
            Alert.alert('Error', 'Please select a vendor');
            return;
        }

        const validItems = items.filter(i => i.material_name && i.quantity > 0);
        if (validItems.length === 0) {
            Alert.alert('Error', 'Please add at least one valid item');
            return;
        }

        try {
            const poData = {
                company_id: user.company_id,
                master_vendor_id: selectedVendor.id,
                vendor_name: selectedVendor.name,
                vendor_email: selectedVendor.email,
                total_amount: calculateGrandTotal(),
                created_by: user.id,
                items: validItems.map(i => ({
                    material_name: i.material_name,
                    hsn: i.hsn,
                    quantity: parseFloat(i.quantity),
                    unit: i.unit,
                    unit_price: parseFloat(i.unit_price),
                    gst_rate: parseFloat(i.gst_rate || 0),
                    total_price: i.total_price
                }))
            };

            // Navigate to Gmail or Mail app using MailComposer for status detection
            if (selectedVendor.email) {
                const isAvailable = await MailComposer.isAvailableAsync();
                if (!isAvailable) {
                    Alert.alert('Mail Not Configured', 'Please configure a mail account on your device to send Purchase Orders.');
                    return;
                }

                const subject = `📥 Purchase Order: ${companyInfo?.name || 'SVCEE'} - ${new Date().toLocaleDateString()}`;

                // Header with Company Details
                let body = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                body += `  🏢 ${companyInfo?.name || 'SVCEE'}\n`;
                body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                if (companyInfo?.address) body += `  📍 ${companyInfo.address}\n`;
                if (companyInfo?.phone) body += `  📞 ${companyInfo.phone}\n`;
                body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

                body += `👤 VENDOR DETAILS:\n`;
                body += `   Name: ${selectedVendor.name}\n`;
                body += `   Date: ${new Date().toLocaleDateString()}\n\n`;

                body += `Dear ${selectedVendor.name},\n\n`;
                body += `Please find our Purchase Order items listed below:\n\n`;

                // Table Header
                body += `┌────┬────────────────────────────┬──────────┬──────────┐\n`;
                body += `│ SN │ Material Name              │ HSN      │ Quantity │\n`;
                body += `├────┼────────────────────────────┼──────────┼──────────┤\n`;

                validItems.forEach((item, idx) => {
                    const sn = (idx + 1).toString().padEnd(2);
                    const name = item.material_name.substring(0, 26).padEnd(26);
                    const hsn = (item.hsn || 'N/A').substring(0, 8).padEnd(8);
                    const qty = `${item.quantity} ${item.unit}`.substring(0, 8).padEnd(8);

                    body += `│ ${sn} │ ${name} │ ${hsn} │ ${qty} │\n`;
                });

                body += `└────┴────────────────────────────┴──────────┴──────────┘\n\n`;

                body += `✅ Total Items: ${validItems.length}\n`;
                body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                body += `Regards,\n\n`;
                body += `👤 ${user.name}\n`;
                body += `🏢 ${companyInfo?.name || 'SVCEE'}\n`;
                body += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

                const result = await MailComposer.composeAsync({
                    recipients: [selectedVendor.email],
                    subject: subject,
                    body: body,
                    isHtml: false
                });

                // Manual Confirmation Flow
                Alert.alert(
                    'Email Processed',
                    'Did you successfully send the email? Save this order to Manage Orders?',
                    [
                        {
                            text: 'No, Discard',
                            style: 'cancel',
                            onPress: () => console.log('PO Save Cancelled by user')
                        },
                        {
                            text: 'Yes, Save',
                            onPress: async () => {
                                try {
                                    await purchaseOrdersAPI.create(poData);
                                    Alert.alert('Success', 'Purchase Order saved to history!');
                                    navigation.navigate('ManageOrders', { user });
                                } catch (err) {
                                    console.error('Save failed:', err);
                                    Alert.alert('Error', 'Failed to save order to database.');
                                }
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Email Required', 'Vendor has no email address. Purchase Orders require an email to be sent for tracking.');
            }
        } catch (error) {
            console.error('Error saving PO:', error);
            Alert.alert('Error', 'Failed to save purchase order');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#28A745" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Purchase Order</Text>
            </View>

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                {/* Vendor Section */}
                <TouchableOpacity
                    style={styles.vendorSelector}
                    onPress={() => setVendorModalVisible(true)}
                >
                    <Text style={styles.vendorLabel}>Select Vendor:</Text>
                    <Text style={styles.vendorName}>
                        {selectedVendor ? selectedVendor.name : 'Click to select a vendor'}
                    </Text>
                    {selectedVendor && <Text style={styles.vendorEmail}>{selectedVendor.email}</Text>}
                </TouchableOpacity>

                {/* Items Section */}
                <Text style={styles.sectionTitle}>Order Items</Text>
                {items.map((item, index) => (
                    <View key={index} style={styles.itemCard}>
                        <View style={styles.itemHeader}>
                            <Text style={styles.itemNumber}>Item #{index + 1}</Text>
                            {items.length > 1 && (
                                <TouchableOpacity onPress={() => removeRow(index)}>
                                    <Text style={styles.removeText}>Remove</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <Text style={styles.inputLabel}>Material Name *</Text>
                        <TextInput
                            style={styles.input}
                            value={item.material_name}
                            onChangeText={(text) => handleMaterialInputChange(index, text)}
                            placeholder="Type material name..."
                        />

                        {item.showSuggestions && item.suggestions.length > 0 && (
                            <View style={styles.suggestionsContainer}>
                                {item.suggestions.map((s, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={styles.suggestionItem}
                                        onPress={() => selectMaterial(index, s)}
                                    >
                                        <Text style={styles.suggestionText}>{s.material_name}</Text>
                                        <Text style={styles.suggestionSubText}>HSN: {s.hsn_code || 'N/A'}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        <View style={styles.row}>
                            <View style={[styles.flex1, { marginRight: 10 }]}>
                                <Text style={styles.inputLabel}>HSN</Text>
                                <TextInput
                                    style={styles.input}
                                    value={item.hsn}
                                    onChangeText={(text) => handleItemChange(index, 'hsn', text)}
                                    placeholder="HSN"
                                />
                            </View>
                            <View style={styles.flex1}>
                                <Text style={styles.inputLabel}>Quantity *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={item.quantity}
                                    onChangeText={(text) => handleItemChange(index, 'quantity', text)}
                                    placeholder="0"
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                    </View>
                ))}

                <TouchableOpacity style={styles.addButton} onPress={addRow}>
                    <Text style={styles.addButtonText}>+ Add Another Item</Text>
                </TouchableOpacity>



                <TouchableOpacity style={styles.saveButton} onPress={handleSaveAndShare}>
                    <Text style={styles.saveButtonText}>Save & Share via Email</Text>
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Vendor Selection Modal */}
            <Modal
                visible={vendorModalVisible}
                animationType="slide"
                transparent={true}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select a Vendor</Text>
                        <FlatList
                            data={vendors}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.vendorItem}
                                    onPress={() => handleVendorSelect(item)}
                                >
                                    <Text style={styles.vendorItemName}>{item.name}</Text>
                                    <Text style={styles.vendorItemEmail}>{item.email}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.emptyText}>No vendors in list. Add them first!</Text>}
                        />
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setVendorModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Footer />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        backgroundColor: '#28A745',
        padding: 20,
        paddingTop: 50,
        flexDirection: 'row',
        alignItems: 'center'
    },
    backText: { color: 'white', fontSize: 16, marginRight: 15 },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    content: { padding: 15 },
    vendorSelector: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    vendorLabel: { fontSize: 12, color: '#666', marginBottom: 5 },
    vendorName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    vendorEmail: { fontSize: 14, color: '#28A745', marginTop: 2 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    itemCard: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#eee'
    },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    itemNumber: { fontWeight: 'bold', color: '#28A745' },
    removeText: { color: '#DC3545', fontSize: 12, fontWeight: 'bold' },
    inputLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 5, marginTop: 10 },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        backgroundColor: '#fafafa'
    },
    row: { flexDirection: 'row' },
    flex1: { flex: 1 },
    itemTotal: {
        textAlign: 'right',
        marginTop: 15,
        fontSize: 14,
        fontWeight: 'bold',
        color: '#28A745'
    },
    addButton: {
        padding: 15,
        borderRadius: 10,
        backgroundColor: '#e7f3ef',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#28A745',
        borderStyle: 'dashed'
    },
    addButtonText: { color: '#28A745', fontWeight: 'bold' },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'white',
        borderRadius: 10,
        marginTop: 20,
        elevation: 3
    },
    totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    totalValue: { fontSize: 22, fontWeight: 'bold', color: '#28A745' },
    saveButton: {
        backgroundColor: '#28A745',
        padding: 18,
        borderRadius: 10,
        marginTop: 20,
        alignItems: 'center',
        elevation: 4
    },
    saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    suggestionsContainer: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#ddd',
        borderTopWidth: 0,
        maxHeight: 150,
        zIndex: 1000
    },
    suggestionItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    suggestionText: { fontSize: 14, color: '#333' },
    suggestionSubText: { fontSize: 12, color: '#666' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, maxHeight: '80%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    vendorItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    vendorItemName: { fontSize: 16, fontWeight: 'bold' },
    vendorItemEmail: { fontSize: 14, color: '#666' },
    closeButton: { marginTop: 20, padding: 15, alignItems: 'center' },
    closeButtonText: { color: '#007BFF', fontWeight: 'bold' },
    emptyText: { textAlign: 'center', padding: 20, color: '#999' }
});
