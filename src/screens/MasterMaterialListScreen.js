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
import { masterMaterialsAPI } from '../config/api';
import Footer from '../components/Footer';

const UNITS = ['kg', 'mt', 'ltr', 'box', 'unit', 'nos', 'set', 'mtr', 'sqft', 'sqmtr'];
const DEFAULT_BUSINESS = 'Main';

export default function MasterMaterialListScreen({ navigation }) {
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState(null);

    // Form states for bulk add (array of items)
    const [formItems, setFormItems] = useState([
        {
            material_name: '',
            hsn_code: '',
            gst_rate: '',
            material_rate: '',
            unit: UNITS[0]
        }
    ]);

    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        setLoading(true);
        try {
            const response = await masterMaterialsAPI.getAll();
            setMaterials(response.data);
        } catch (error) {
            console.error('Error fetching materials:', error);
            Alert.alert('Error', 'Failed to load materials');
        } finally {
            setLoading(false);
        }
    };

    const handleAddRow = () => {
        setFormItems([...formItems, {
            material_name: '',
            hsn_code: '',
            gst_rate: '',
            material_rate: '',
            unit: UNITS[0]
        }]);
    };

    const handleRemoveRow = (index) => {
        if (formItems.length > 1) {
            const newItems = [...formItems];
            newItems.splice(index, 1);
            setFormItems(newItems);
        }
    };

    const handleInputChange = (index, field, value) => {
        const newItems = [...formItems];
        newItems[index][field] = value;
        setFormItems(newItems);
    };

    const handleSave = async () => {
        // Validation
        const validItems = formItems.filter(item => item.material_name.trim() !== '');
        if (validItems.length === 0) {
            Alert.alert('Error', 'Please add at least one material name');
            return;
        }

        try {
            const dataToSave = validItems.map(item => ({
                ...item,
                business_name: DEFAULT_BUSINESS,
                gst_rate: parseFloat(item.gst_rate) || 0,
                material_rate: parseFloat(item.material_rate) || 0
            }));

            if (editingMaterial) {
                // When editing, we only save the first item (since edit is single-item)
                await masterMaterialsAPI.update(editingMaterial.id, dataToSave[0]);
            } else {
                // When adding, we send the whole array
                await masterMaterialsAPI.create(dataToSave);
            }

            setModalVisible(false);
            resetForm();
            fetchMaterials();
            Alert.alert('Success', `Material(s) ${editingMaterial ? 'updated' : 'added'} successfully`);
        } catch (error) {
            console.error('Error saving material:', error);
            const errorMsg = error.response?.data?.error || 'Failed to save material';
            Alert.alert('Error', errorMsg);
        }
    };

    const handleDelete = (id) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this material?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await masterMaterialsAPI.delete(id);
                            fetchMaterials();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete material');
                        }
                    }
                }
            ]
        );
    };

    const openEditModal = (material) => {
        setEditingMaterial(material);
        setFormItems([{
            material_name: material.material_name,
            hsn_code: material.hsn_code || '',
            gst_rate: material.gst_rate?.toString() || '',
            material_rate: material.material_rate?.toString() || '',
            unit: material.unit
        }]);
        setModalVisible(true);
    };

    const resetForm = () => {
        setEditingMaterial(null);
        setFormItems([{
            material_name: '',
            hsn_code: '',
            gst_rate: '',
            material_rate: '',
            unit: UNITS[0]
        }]);
    };

    const filteredMaterials = materials.filter(m =>
        m.material_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.hsn_code && m.hsn_code.includes(searchQuery))
    );

    const renderMaterialItem = ({ item }) => (
        <View style={styles.materialCard}>
            <View style={styles.materialInfo}>
                <Text style={styles.materialName}>{item.material_name}</Text>
                <Text style={styles.subInfo}>HSN: {item.hsn_code || 'N/A'}</Text>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity onPress={() => openEditModal(item)} style={styles.editButton}>
                    <Text style={styles.buttonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                    <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Master Material List</Text>
            </View>

            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search material or HSN..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#28A745" style={styles.loader} />
            ) : (
                <FlatList
                    data={filteredMaterials}
                    renderItem={renderMaterialItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No materials found.</Text>
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
                        <Text style={styles.modalTitle}>{editingMaterial ? 'Edit Material' : 'Add Materials'}</Text>

                        <ScrollView style={styles.formScroll}>
                            {formItems.map((item, index) => (
                                <View key={index} style={styles.itemFormContainer}>
                                    <View style={styles.itemHeader}>
                                        <Text style={styles.itemNumber}>Item #{index + 1}</Text>
                                        {formItems.length > 1 && !editingMaterial && (
                                            <TouchableOpacity onPress={() => handleRemoveRow(index)}>
                                                <Text style={styles.removeText}>Remove</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    <Text style={styles.label}>Material Name *</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={item.material_name}
                                        onChangeText={(text) => handleInputChange(index, 'material_name', text)}
                                        placeholder="Enter material name"
                                    />

                                    <View style={styles.row}>
                                        <View style={styles.flex1}>
                                            <Text style={styles.label}>HSN Code</Text>
                                            <TextInput
                                                style={styles.input}
                                                value={item.hsn_code}
                                                onChangeText={(text) => handleInputChange(index, 'hsn_code', text)}
                                                placeholder="HSN"
                                            />
                                        </View>
                                    </View>
                                    <View style={styles.divider} />
                                </View>
                            ))}

                            {!editingMaterial && (
                                <TouchableOpacity style={styles.addMoreButton} onPress={handleAddRow}>
                                    <Text style={styles.addMoreText}>+ Add Another Item</Text>
                                </TouchableOpacity>
                            )}
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
                                <Text style={styles.buttonText}>Save All</Text>
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
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    searchContainer: {
        padding: 15,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    searchInput: {
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 10,
        fontSize: 16,
    },
    loader: {
        marginTop: 50,
    },
    listContent: {
        padding: 15,
        paddingBottom: 100,
    },
    materialCard: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    materialInfo: {
        flex: 1,
    },
    materialName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    subInfo: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    priceInfo: {
        fontSize: 14,
        color: '#28A745',
        fontWeight: '600',
        marginTop: 4,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    editButton: {
        backgroundColor: '#007BFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    deleteButton: {
        backgroundColor: '#DC3545',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    buttonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        color: '#999',
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
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    fabText: {
        color: 'white',
        fontSize: 30,
        fontWeight: 'bold',
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
        maxHeight: '90%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    formScroll: {
        marginBottom: 20,
    },
    itemFormContainer: {
        marginBottom: 15,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: '#f8f9fa',
        padding: 8,
        borderRadius: 5,
    },
    itemNumber: {
        fontWeight: 'bold',
        color: '#28A745',
    },
    removeText: {
        color: '#DC3545',
        fontWeight: 'bold',
        fontSize: 12,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#555',
        marginBottom: 4,
        marginTop: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        fontSize: 15,
        backgroundColor: '#fafafa',
    },
    row: {
        flexDirection: 'row',
        gap: 10,
    },
    flex1: {
        flex: 1,
    },
    flex2: {
        flex: 2,
    },
    unitScroll: {
        marginTop: 5,
    },
    unitChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#eee',
        marginRight: 5,
    },
    activeUnitChip: {
        backgroundColor: '#28A745',
        borderColor: '#28A745',
    },
    unitText: {
        fontSize: 11,
        color: '#666',
    },
    activeUnitText: {
        color: 'white',
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginTop: 20,
        marginBottom: 10,
    },
    addMoreButton: {
        backgroundColor: '#e7f3ef',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#28A745',
        borderStyle: 'dashed',
        marginBottom: 20,
    },
    addMoreText: {
        color: '#28A745',
        fontWeight: 'bold',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 10,
    },
    modalButton: {
        flex: 1,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#6c757d',
    },
    saveButton: {
        backgroundColor: '#28A745',
    },
});
