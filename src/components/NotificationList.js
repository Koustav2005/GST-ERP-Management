import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { notificationsAPI } from '../config/api';

export default function NotificationList({ user, refreshTrigger, onCountUpdate }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchNotifications();
    }, [user.id, refreshTrigger]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await notificationsAPI.getAll(user.id);
            setNotifications(response.data.notifications);
            setUnreadCount(response.data.unread_count);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Update parent component when unread count changes
    useEffect(() => {
        if (onCountUpdate) {
            onCountUpdate(unreadCount);
        }
    }, [unreadCount, onCountUpdate]);

    const markAsRead = async (notification) => {
        if (notification.is_read) return;

        try {
            await notificationsAPI.markAsRead(notification.id);

            // Update local state
            setNotifications(prev => prev.map(n =>
                n.id === notification.id ? { ...n, is_read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await notificationsAPI.markAllAsRead(user.id);

            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
            Alert.alert('Error', 'Failed to mark all as read');
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.notificationItem, !item.is_read && styles.unreadItem]}
            onPress={() => markAsRead(item)}
        >
            <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>{item.title}</Text>
                <Text style={styles.notificationDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                </Text>
            </View>
            <Text style={styles.notificationMessage}>{item.message}</Text>
            {!item.is_read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
    );

    if (loading && notifications.length === 0) {
        return <ActivityIndicator size="small" color="#007AFF" />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flex: 1 }} />
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={markAllAsRead}>
                        <Text style={styles.markAllReadText}>Mark all read</Text>
                    </TouchableOpacity>
                )}
            </View>

            {notifications.length === 0 ? (
                <Text style={styles.emptyText}>No notifications</Text>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    style={styles.list}
                    nestedScrollEnabled={true}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingBottom: 10,
    },
    markAllReadText: {
        fontSize: 12,
        color: '#007AFF',
        fontWeight: '600',
    },
    list: {
        flex: 1,
    },
    notificationItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        position: 'relative',
    },
    unreadItem: {
        backgroundColor: '#F0F8FF',
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    notificationTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    notificationDate: {
        fontSize: 10,
        color: '#999',
    },
    notificationMessage: {
        fontSize: 12,
        color: '#666',
    },
    unreadDot: {
        position: 'absolute',
        top: 10,
        right: 5,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#007AFF',
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        padding: 20,
        fontStyle: 'italic',
    },
});
