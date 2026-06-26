import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import NotificationIcon from '../../components/NotificationIcon';
import SideMenu from '../../components/SideMenu';
import Footer from '../../components/Footer';

export default function NPDDashboard({ user, onLogout, navigation }) {
    const [refreshing, setRefreshing] = useState(false);
    const [sideMenuVisible, setSideMenuVisible] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        setRefreshing(false);
    };

    const menuItems = [
        { title: 'Projects', icon: '📁', action: 'ProjectList' },
        { title: 'Design Review', icon: '🎨', action: null },
        { title: 'Prototypes', icon: '🔧', action: null },
        { title: 'Testing', icon: '🧪', action: null },
        { title: 'Enquiries', icon: '📋', action: 'Enquiry' },
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
                        colors={['#6F42C1']}
                        tintColor="#6F42C1"
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
                        <Text style={styles.role}>NPD (New Product Development)</Text>
                    </View>
                    <View style={styles.headerButtons}>
                        <NotificationIcon user={user} />
                    </View>
                </View>

                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>8</Text>
                        <Text style={styles.statLabel}>Active Projects</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>5</Text>
                        <Text style={styles.statLabel}>In Design</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>3</Text>
                        <Text style={styles.statLabel}>In Testing</Text>
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
                themeColor="#6F42C1"
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
        backgroundColor: '#6F42C1',
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
        color: '#6F42C1',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 5,
        textAlign: 'center',
    },
});
