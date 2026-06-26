import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    RefreshControl,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { projectsAPI } from '../config/api';

export default function RequirementsScreen({ route, navigation }) {
    const { user } = route.params;
    const [requirements, setRequirements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedRequirement, setSelectedRequirement] = useState(null);
    const [items, setItems] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    useEffect(() => {
        fetchRequirements();
    }, []);

    const fetchRequirements = async () => {
        try {
            setLoading(true);
            const response = await projectsAPI.getReceivedRequirements(user.id);
            setRequirements(response.data.requirements || []);
        } catch (error) {
            console.error('Error fetching requirements:', error);
            Alert.alert('Error', 'Failed to load requirements');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchRequirements();
    };

    const handleViewDetails = async (requirement) => {
        try {
            setLoading(true);
            const response = await projectsAPI.getRequirement(requirement.id);
            setSelectedRequirement(response.data.requirement);
            setItems(response.data.items || []);
            setModalVisible(true);
        } catch (error) {
            console.error('Error fetching requirement details:', error);
            Alert.alert('Error', 'Failed to load requirement details');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        try {
            setUpdatingStatus(true);
            await projectsAPI.updateRequirementStatus(selectedRequirement.id, newStatus);
            Alert.alert('Success', `Requirement marked as ${newStatus}`);
            setModalVisible(false);
            fetchRequirements();
        } catch (error) {
            console.error('Error updating status:', error);
            Alert.alert('Error', 'Failed to update status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent': return '#FF3B30';
            case 'high': return '#FF9500';
            case 'medium': return '#007AFF';
            case 'low': return '#34C759';
            default: return '#8E8E93';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'fulfilled': return '#34C759';
            case 'reviewed': return '#007AFF';
            case 'pending': return '#FF9500';
            case 'rejected': return '#FF3B30';
            default: return '#8E8E93';
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Material Requirements</Text>
                <View style={{ width: 50 }} />
            </View>

            <ScrollView
                style={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {loading && !refreshing && requirements.length === 0 ? (
                    <ActivityIndicator size="large" color="#28A745" style={{ marginTop: 50 }} />
                ) : requirements.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyIcon}>📋</Text>
                        <Text style={styles.emptyText}>No requirements received yet</Text>
                    </View>
                ) : (
                    requirements.map((req) => (
                        <TouchableOpacity
                            key={req.id}
                            style={styles.card}
                            onPress={() => handleViewDetails(req)}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{req.title}</Text>
                                <View style={[styles.badge, { backgroundColor: getStatusColor(req.status) }]}>
                                    <Text style={styles.badgeText}>{req.status}</Text>
                                </View>
                            </View>

                            <View style={styles.cardBody}>
                                <Text style={styles.cardLabel}>From: <Text style={styles.cardValue}>{req.created_by_name}</Text></Text>
                                <Text style={styles.cardLabel}>Priority: <Text style={[styles.cardValue, { color: getPriorityColor(req.priority), fontWeight: 'bold' }]}>{req.priority.toUpperCase()}</Text></Text>
                                {req.project_name && (
                                    <Text style={styles.cardLabel}>Project: <Text style={styles.cardValue}>{req.project_name}</Text></Text>
                                )}
                            </View>

                            <Text style={styles.cardDate}>{new Date(req.created_at).toLocaleString()}</Text>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* Details Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Requirement Details</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={styles.closeIcon}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Title:</Text>
                                <Text style={styles.detailValue}>{selectedRequirement?.title}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>From:</Text>
                                <Text style={styles.detailValue}>{selectedRequirement?.created_by_name}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Priority:</Text>
                                <View style={[styles.statusBadge, { backgroundColor: getPriorityColor(selectedRequirement?.priority) }]}>
                                    <Text style={styles.statusText}>{selectedRequirement?.priority}</Text>
                                </View>
                            </View>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Status:</Text>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedRequirement?.status) }]}>
                                    <Text style={styles.statusText}>{selectedRequirement?.status}</Text>
                                </View>
                            </View>

                            <Text style={styles.itemsTitle}>Items Requested:</Text>
                            {items.map((item, index) => (
                                <View key={index} style={styles.itemCard}>
                                    <Text style={styles.itemName}>{item.item_name}</Text>
                                    <View style={styles.itemMeta}>
                                        <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                                        {item.hsn && <Text style={styles.itemHsn}>HSN: {item.hsn}</Text>}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            {selectedRequirement?.status === 'pending' && (
                                <View style={styles.actionButtons}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.reviewButton]}
                                        onPress={() => handleUpdateStatus('reviewed')}
                                        disabled={updatingStatus}
                                    >
                                        <Text style={styles.actionButtonText}>Mark Reviewed</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.fulfillButton]}
                                        onPress={() => handleUpdateStatus('fulfilled')}
                                        disabled={updatingStatus}
                                    >
                                        <Text style={styles.actionButtonText}>Mark Fulfilled</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            {selectedRequirement?.status === 'reviewed' && (
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.fulfillButton, { width: '100%' }]}
                                    onPress={() => handleUpdateStatus('fulfilled')}
                                    disabled={updatingStatus}
                                >
                                    <Text style={styles.actionButtonText}>Mark Fulfilled</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.closeButtonText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        padding: 15,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
    },
    emptyIcon: {
        fontSize: 60,
        marginBottom: 10,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        marginRight: 10,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    cardBody: {
        marginBottom: 10,
    },
    cardLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    cardValue: {
        color: '#333',
        fontWeight: '500',
    },
    cardDate: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 15,
        width: '90%',
        maxHeight: '80%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    closeIcon: {
        fontSize: 20,
        color: '#666',
        padding: 5,
    },
    modalBody: {
        marginBottom: 20,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 10,
        alignItems: 'center',
    },
    detailLabel: {
        width: 80,
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    detailValue: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 5,
    },
    statusText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'capitalize',
    },
    itemsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 20,
        marginBottom: 10,
    },
    itemCard: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#28A745',
    },
    itemName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    itemMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    itemQty: {
        fontSize: 14,
        color: '#666',
    },
    itemHsn: {
        fontSize: 14,
        color: '#999',
    },
    modalFooter: {
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 15,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        gap: 10,
    },
    actionButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    reviewButton: {
        backgroundColor: '#007AFF',
    },
    fulfillButton: {
        backgroundColor: '#28A745',
    },
    actionButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    closeButton: {
        padding: 12,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
});
