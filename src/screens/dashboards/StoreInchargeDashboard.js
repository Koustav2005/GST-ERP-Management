import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import NotificationIcon from '../../components/NotificationIcon';
import SideMenu from '../../components/SideMenu';
import Footer from '../../components/Footer';
import { projectsAPI } from '../../config/api';

export default function StoreInchargeDashboard({ user, onLogout, navigation }) {
    const [refreshing, setRefreshing] = useState(false);
    const [sideMenuVisible, setSideMenuVisible] = useState(false);
    const [loading, setLoading] = useState(true);

    // Dynamic stats
    const [inventoryCount, setInventoryCount] = useState(0);
    const [lowStockCount, setLowStockCount] = useState(0);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

    const fetchStats = async () => {
        try {
            // Fetch inventory
            const invResponse = await projectsAPI.getInventory(user.company_id);
            const invList = invResponse.data.inventory || [];
            
            // Total items in stock
            const totalItems = invList.reduce((acc, item) => acc + (parseFloat(item.quantity) || 0), 0);
            setInventoryCount(Math.round(totalItems));

            // Low stock items (quantity < 10)
            const lowStock = invList.filter(item => (parseFloat(item.quantity) || 0) < 10).length;
            setLowStockCount(lowStock);

            // Fetch pending requests
            const reqResponse = await projectsAPI.getStoreRequests(user.company_id);
            const reqList = reqResponse.data.requests || [];
            const pendingCount = reqList.filter(r => r.status === 'pending' || r.status === 'partially_allocated' || r.status === 'partially_fulfilled').length;
            setPendingRequestsCount(pendingCount);

        } catch (error) {
            console.error('Error fetching dashboard stats for Store Incharge:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchStats();
    };

    const menuItems = [
        { title: 'Inventory', icon: '📦', action: 'Inventory' },
        { title: 'In Stock', icon: '📥', action: 'InStockOrders' },
        { title: 'Out Stock', icon: '📤', action: 'OutStockRequests' },
        { title: 'Job Work', icon: '🏭', action: 'StoreInchargeJobWork' },
        { title: 'External Material Receipt', icon: '📥', action: 'ExternalJobworkReceipt' },
        { title: 'External Inventory', icon: '📦', action: 'ExternalJobworkInventory' },
        { title: 'Barcodes', icon: '🔖', action: 'Barcodes' },
    ];

    const handleMenuPress = (item) => {
        if (item.action) {
            navigation.navigate(item.action, { user });
        } else {
            console.log('Pressed:', item.title);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                style={styles.container}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#FFC107']}
                        tintColor="#FFC107"
                    />
                }
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setSideMenuVisible(true)} style={styles.hamburgerBtn}>
                        <Text style={styles.hamburgerText}>☰</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.greeting}>Welcome back,</Text>
                        <Text style={styles.name}>{user.name}</Text>
                        <Text style={styles.role}>Store Incharge</Text>
                    </View>
                    <View style={styles.headerButtons}>
                        <NotificationIcon user={user} />
                    </View>
                </View>

                {loading && !refreshing ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#FFC107" />
                        <Text style={styles.loadingText}>Loading dashboard data...</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.statsContainer}>
                            <TouchableOpacity 
                                style={styles.statCard}
                                onPress={() => navigation.navigate('Inventory', { user })}
                            >
                                <Text style={styles.statValue}>{inventoryCount}</Text>
                                <Text style={styles.statLabel}>Total Units in Stock</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.statCard}
                                onPress={() => navigation.navigate('Inventory', { user })}
                            >
                                <Text style={[styles.statValue, { color: '#DC3545' }]}>{lowStockCount}</Text>
                                <Text style={styles.statLabel}>Low Stock Items</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.statCard}
                                onPress={() => navigation.navigate('OutStockRequests', { user })}
                            >
                                <Text style={[styles.statValue, { color: '#FF9500' }]}>{pendingRequestsCount}</Text>
                                <Text style={styles.statLabel}>Pending Out Requests</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.sectionTitle}>Quick Actions</Text>
                        <View style={styles.menuGrid}>
                            {menuItems.map((item, index) => (
                                <TouchableOpacity 
                                    key={index} 
                                    style={styles.menuItem}
                                    onPress={() => handleMenuPress(item)}
                                >
                                    <Text style={styles.menuIcon}>{item.icon}</Text>
                                    <Text style={styles.menuTitle}>{item.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}

                <Footer />
            </ScrollView>

            <SideMenu
                visible={sideMenuVisible}
                onClose={() => setSideMenuVisible(false)}
                menuItems={menuItems}
                onMenuPress={handleMenuPress}
                user={user}
                onLogout={onLogout}
                themeColor="#FFC107"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#FFC107',
        padding: 20,
        paddingTop: 50,
        flexDirection: 'row',
        alignItems: 'center',
    },
    hamburgerBtn: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    hamburgerText: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
    },
    greeting: {
        color: 'white',
        fontSize: 16,
        opacity: 0.9,
    },
    name: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 5,
    },
    role: {
        color: 'white',
        fontSize: 14,
        opacity: 0.8,
        marginTop: 5,
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 15,
        gap: 10,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFC107',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 5,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 15,
        marginTop: 10,
        marginBottom: 10,
        color: '#333',
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 10,
    },
    menuItem: {
        width: '48%',
        backgroundColor: 'white',
        margin: '1%',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    menuIcon: {
        fontSize: 40,
        marginBottom: 10,
    },
    menuTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#8E8E93',
    },
});
