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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { projectsAPI } from '../config/api';

export default function SendRequirementsScreen({ route, navigation }) {
    const { user, projectId, prefillItems } = route.params;
    const [loading, setLoading] = useState(false);
    const [accountants, setAccountants] = useState([]);
    const [selectedAccountant, setSelectedAccountant] = useState('');
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('medium');
    const [items, setItems] = useState(prefillItems || [{ item_name: '', quantity: '', hsn: '' }]);

    useEffect(() => {
        fetchAccountants();
        if (projectId) {
            setTitle(`Requirements for Project ID: ${projectId}`);
        }
    }, []);

    const fetchAccountants = async () => {
        try {
            setLoading(true);
            const response = await projectsAPI.getAccountants(user.company_id);
            setAccountants(response.data.accountants || []);
        } catch (error) {
            console.error('Error fetching accountants:', error);
            Alert.alert('Error', 'Failed to load accountants');
        } finally {
            setLoading(false);
        }
    };

    const addItem = () => {
        setItems([...items, { item_name: '', quantity: '', hsn: '' }]);
    };

    const removeItem = (index) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleSend = async () => {
        if (!selectedAccountant) {
            Alert.alert('Error', 'Please select an Accountant');
            return;
        }
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a title');
            return;
        }

        const validItems = items.filter(item => item.item_name.trim() && item.quantity.trim());
        if (validItems.length === 0) {
            Alert.alert('Error', 'Please add at least one item with name and quantity');
            return;
        }

        try {
            setLoading(true);
            const requirementData = {
                title: title.trim(),
                priority,
                created_by: user.id,
                sent_to: parseInt(selectedAccountant),
                project_id: projectId || null,
                items: validItems
            };

            await projectsAPI.createRequirement(requirementData);
            Alert.alert('Success', 'Requirement sent successfully!');
            navigation.goBack();
        } catch (error) {
            console.error('Error sending requirement:', error);
            Alert.alert('Error', error.response?.data?.error || 'Failed to send requirement');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Send Requirements</Text>
                <View style={{ width: 50 }} />
            </View>

            <ScrollView style={styles.content}>
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Select Accountant *</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={selectedAccountant}
                            onValueChange={(itemValue) => setSelectedAccountant(itemValue)}
                            style={styles.picker}
                        >
                            <Picker.Item label="Select Accountant..." value="" />
                            {accountants.map((acc) => (
                                <Picker.Item key={acc.id} label={acc.name} value={acc.id.toString()} />
                            ))}
                        </Picker>
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Title *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Urgent Materials for Project X"
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Priority</Text>
                    <View style={styles.priorityContainer}>
                        {['low', 'medium', 'high', 'urgent'].map((p) => (
                            <TouchableOpacity
                                key={p}
                                style={[
                                    styles.priorityButton,
                                    priority === p && styles.priorityButtonActive,
                                    priority === p && { backgroundColor: p === 'urgent' ? '#FF3B30' : p === 'high' ? '#FF9500' : p === 'medium' ? '#007AFF' : '#34C759' }
                                ]}
                                onPress={() => setPriority(p)}
                            >
                                <Text style={[styles.priorityButtonText, priority === p && styles.priorityButtonTextActive]}>
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.itemsHeader}>
                    <Text style={styles.label}>Items *</Text>
                    <TouchableOpacity onPress={addItem} style={styles.addItemButton}>
                        <Text style={styles.addItemText}>+ Add Item</Text>
                    </TouchableOpacity>
                </View>

                {items.map((item, index) => (
                    <View key={index} style={styles.itemCard}>
                        <View style={styles.itemRow}>
                            <View style={[styles.formGroup, { flex: 2, marginRight: 10 }]}>
                                <Text style={styles.itemLabel}>Item Name</Text>
                                <TextInput
                                    style={styles.itemInput}
                                    placeholder="e.g. Steel Bar"
                                    value={item.item_name}
                                    onChangeText={(val) => updateItem(index, 'item_name', val)}
                                />
                            </View>
                            <View style={[styles.formGroup, { flex: 1 }]}>
                                <Text style={styles.itemLabel}>Quantity</Text>
                                <TextInput
                                    style={styles.itemInput}
                                    placeholder="e.g. 50 kg"
                                    value={item.quantity}
                                    onChangeText={(val) => updateItem(index, 'quantity', val)}
                                />
                            </View>
                        </View>
                        <View style={styles.itemRow}>
                            <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                                <Text style={styles.itemLabel}>HSN (Optional)</Text>
                                <TextInput
                                    style={styles.itemInput}
                                    placeholder="HSN Code"
                                    value={item.hsn}
                                    onChangeText={(val) => updateItem(index, 'hsn', val)}
                                    keyboardType="numeric"
                                />
                            </View>
                            {items.length > 1 && (
                                <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeButton}>
                                    <Text style={styles.removeButtonText}>Remove</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                ))}

                <TouchableOpacity
                    style={[styles.sendButton, loading && styles.disabledButton]}
                    onPress={handleSend}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.sendButtonText}>Send Requirement</Text>
                    )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#6F42C1',
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
    content: {
        padding: 20,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    pickerContainer: {
        backgroundColor: 'white',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        width: '100%',
    },
    priorityContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 5,
    },
    priorityButton: {
        flex: 1,
        paddingVertical: 10,
        backgroundColor: 'white',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    priorityButtonActive: {
        borderColor: 'transparent',
    },
    priorityButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    priorityButtonTextActive: {
        color: 'white',
    },
    itemsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        marginTop: 10,
    },
    addItemButton: {
        backgroundColor: '#6F42C1',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    addItemText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 12,
    },
    itemCard: {
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
    itemRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    itemLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 5,
    },
    itemInput: {
        backgroundColor: '#f9f9f9',
        borderRadius: 6,
        padding: 10,
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#eee',
    },
    removeButton: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        marginBottom: 10,
    },
    removeButtonText: {
        color: '#FF3B30',
        fontWeight: '600',
        fontSize: 12,
    },
    sendButton: {
        backgroundColor: '#28A745',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    sendButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
});
