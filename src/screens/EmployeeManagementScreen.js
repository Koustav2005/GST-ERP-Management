import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { usersAPI } from '../config/api';

export default function EmployeeManagementScreen({ route, navigation }) {
    const { user } = route.params;
    const [activeTab, setActiveTab] = useState('pending');
    const [pendingEmployees, setPendingEmployees] = useState([]);
    const [approvedEmployees, setApprovedEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const [pendingRes, approvedRes] = await Promise.all([
                usersAPI.getPending(user.company_id),
                usersAPI.getCompanyEmployees(user.company_id),
            ]);

            setPendingEmployees(pendingRes.data);
            setApprovedEmployees(approvedRes.data.filter(emp => emp.role !== 'management'));
        } catch (error) {
            console.error('Error fetching employees:', error);
            Alert.alert('Error', 'Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchEmployees();
        setRefreshing(false);
    };

    const handleApprove = async (employee) => {
        Alert.alert(
            'Approve Employee',
            `Approve ${employee.name} (${employee.role})?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: async () => {
                        try {
                            await usersAPI.approveUser(employee.id);
                            Alert.alert('Success', `${employee.name} has been approved`);
                            fetchEmployees();
                        } catch (error) {
                            console.error('Error approving employee:', error);
                            Alert.alert('Error', 'Failed to approve employee');
                        }
                    },
                },
            ]
        );
    };

    const handleReject = async (employee) => {
        Alert.alert(
            'Reject Employee',
            `Are you sure you want to reject ${employee.name}? This will delete their account.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await usersAPI.deleteUser(employee.id);
                            Alert.alert('Success', `${employee.name} has been rejected`);
                            fetchEmployees();
                        } catch (error) {
                            console.error('Error rejecting employee:', error);
                            Alert.alert('Error', 'Failed to reject employee');
                        }
                    },
                },
            ]
        );
    };

    const formatRole = (role) => {
        const roleMap = {
            accountant: 'Accountant',
            store_incharge: 'Store Incharge',
            npd: 'NPD',
            management: 'Management',
            project_manager: 'Project Manager',
            worker: 'Worker',
        };
        return roleMap[role] || role;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const renderEmployee = (employee, isPending = false) => (
        <View key={employee.id} style={styles.employeeCard}>
            <View style={styles.employeeInfo}>
                <Text style={styles.employeeName}>{employee.name}</Text>
                <Text style={styles.employeeEmail}>{employee.email}</Text>
                <Text style={styles.employeeRole}>{formatRole(employee.role)}</Text>
                <Text style={styles.employeeDate}>
                    {isPending ? `Requested: ${formatDate(employee.created_at)}` : `Approved: ${formatDate(employee.approved_at)}`}
                </Text>
            </View>

            {isPending && (
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.approveButton]}
                        onPress={() => handleApprove(employee)}
                    >
                        <Text style={styles.actionButtonText}>✓ Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.rejectButton]}
                        onPress={() => handleReject(employee)}
                    >
                        <Text style={styles.actionButtonText}>✗ Reject</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Employee Management</Text>
            </View>

            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
                    onPress={() => setActiveTab('pending')}
                >
                    <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
                        Pending ({pendingEmployees.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'approved' && styles.activeTab]}
                    onPress={() => setActiveTab('approved')}
                >
                    <Text style={[styles.tabText, activeTab === 'approved' && styles.activeTabText]}>
                        Approved ({approvedEmployees.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : (
                <ScrollView
                    style={styles.content}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} />
                    }
                >
                    {activeTab === 'pending' ? (
                        pendingEmployees.length > 0 ? (
                            pendingEmployees.map((emp) => renderEmployee(emp, true))
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyIcon}>✓</Text>
                                <Text style={styles.emptyText}>No pending approvals</Text>
                            </View>
                        )
                    ) : (
                        approvedEmployees.length > 0 ? (
                            approvedEmployees.map((emp) => renderEmployee(emp, false))
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyIcon}>👥</Text>
                                <Text style={styles.emptyText}>No approved employees yet</Text>
                            </View>
                        )
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#007AFF',
        padding: 20,
        paddingTop: 50,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 15,
    },
    backButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    tab: {
        flex: 1,
        paddingVertical: 15,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#007AFF',
    },
    tabText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#007AFF',
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        padding: 15,
    },
    employeeCard: {
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
    employeeInfo: {
        marginBottom: 10,
    },
    employeeName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    employeeEmail: {
        fontSize: 14,
        color: '#666',
        marginBottom: 3,
    },
    employeeRole: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '600',
        marginBottom: 3,
    },
    employeeDate: {
        fontSize: 12,
        color: '#999',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 5,
        alignItems: 'center',
    },
    approveButton: {
        backgroundColor: '#28A745',
    },
    rejectButton: {
        backgroundColor: '#DC3545',
    },
    actionButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIcon: {
        fontSize: 60,
        marginBottom: 15,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
});
