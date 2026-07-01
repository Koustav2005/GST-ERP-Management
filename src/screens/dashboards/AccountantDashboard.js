import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import NotificationIcon from '../../components/NotificationIcon';
import SideMenu from '../../components/SideMenu';
import Footer from '../../components/Footer';

export default function AccountantDashboard({ user, onLogout, navigation }) {
    const [refreshing, setRefreshing] = useState(false);
    const [sideMenuVisible, setSideMenuVisible] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        setRefreshing(false);
    };

    const menuItems = [
        { title: 'Financial Reports', icon: '💰', action: null },
        { title: 'Invoices', icon: '📄', action: null },
        { title: 'Expenses', icon: '💸', action: null },
        { title: 'GST Returns', icon: '📊', action: null },
        { title: 'Master Material List', icon: '📋', action: 'MasterMaterialList' },
        { title: 'Master Vendor List', icon: '🏪', action: 'MasterVendorList' },
        { title: 'Create Purchase Order', icon: '📜', action: 'CreatePO' },
        { title: 'Manage Orders', icon: '📦', action: 'ManageOrders' },
        { title: 'Requirements', icon: '📋', action: 'Requirements' },
        { title: 'Internal Job Work', icon: '🛠️', action: 'InternalJobWork' },
        { title: 'External Material Challan', icon: '📑', action: 'ExternalJobworkChallan' },
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
                        colors={['#28A745']}
                        tintColor="#28A745"
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
                        <Text style={styles.role}>Accountant</Text>
                    </View>
                    <View style={styles.headerButtons}>
                        <NotificationIcon user={user} />
                    </View>
                </View>

                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>₹2.5L</Text>
                        <Text style={styles.statLabel}>Monthly Revenue</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>15</Text>
                        <Text style={styles.statLabel}>Pending Invoices</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>₹45K</Text>
                        <Text style={styles.statLabel}>Expenses</Text>
                    </View>
                </View>

                <Footer />
            </ScrollView>

            <SideMenu
                visible={sideMenuVisible}
                onClose={() => setSideMenuVisible(false)}
                menuItems={menuItems}
                onMenuPress={handleMenuPress}
                user={user}
                onLogout={onLogout}
                themeColor="#28A745"
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
        backgroundColor: '#28A745',
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
        color: '#28A745',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 5,
        textAlign: 'center',
    },
});
