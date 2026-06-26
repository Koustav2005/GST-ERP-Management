import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Modal, Animated, Dimensions } from 'react-native';
import NotificationList from './NotificationList';
import { notificationsAPI } from '../config/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function NotificationIcon({ user }) {
    const [modalVisible, setModalVisible] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 60000);
        return () => clearInterval(interval);
    }, [user.id]);

    useEffect(() => {
        if (modalVisible) {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }).start();
        } else {
            slideAnim.setValue(SCREEN_WIDTH);
        }
    }, [modalVisible]);

    const handleClose = () => {
        Animated.timing(slideAnim, {
            toValue: SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            setModalVisible(false);
        });
    };

    const fetchUnreadCount = async () => {
        try {
            const response = await notificationsAPI.getUnreadCount(user.id);
            setUnreadCount(response.data.unread_count);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    return (
        <>
            <TouchableOpacity
                style={styles.container}
                onPress={() => setModalVisible(true)}
            >
                <Text style={styles.icon}>🔔</Text>
                {unreadCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unreadCount}</Text>
                    </View>
                )}
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="none"
                onRequestClose={handleClose}
            >
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback onPress={handleClose}>
                        <View style={styles.backdrop} />
                    </TouchableWithoutFeedback>

                    <Animated.View style={[styles.panelContainer, { transform: [{ translateX: slideAnim }] }]}>
                        {/* Header */}
                        <View style={styles.panelHeader}>
                            <TouchableOpacity onPress={handleClose} style={styles.backBtn}>
                                <Text style={styles.backText}>← Back</Text>
                            </TouchableOpacity>
                            <Text style={styles.panelTitle}>Notifications</Text>
                            <View style={{ width: 60 }} />
                        </View>

                        {/* Notification List */}
                        <View style={styles.panelBody}>
                            <NotificationList
                                user={user}
                                refreshTrigger={modalVisible}
                                onCountUpdate={setUnreadCount}
                            />
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 8,
        marginRight: 10,
        position: 'relative',
    },
    icon: {
        fontSize: 24,
        color: 'white',
    },
    badge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1,
        borderColor: 'white',
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    overlay: {
        flex: 1,
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    panelContainer: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        backgroundColor: '#f5f5f5',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: -4, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    panelHeader: {
        backgroundColor: '#333',
        paddingTop: 50,
        paddingBottom: 15,
        paddingHorizontal: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtn: {
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    backText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    panelTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    panelBody: {
        flex: 1,
    },
});
