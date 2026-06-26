import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Modal,
    Animated,
    Dimensions,
    ScrollView,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MENU_WIDTH = SCREEN_WIDTH * 0.75;

export default function SideMenu({ visible, onClose, menuItems, onMenuPress, user, onLogout, themeColor = '#007AFF' }) {
    const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;

    useEffect(() => {
        if (visible) {
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: -MENU_WIDTH,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>

                <Animated.View style={[styles.menuContainer, { transform: [{ translateX: slideAnim }] }]}>
                    {/* Menu Header */}
                    <View style={[styles.menuHeader, { backgroundColor: themeColor }]}>
                        <View style={styles.menuUserInfo}>
                            <View style={styles.menuAvatar}>
                                <Text style={styles.menuAvatarText}>
                                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                                </Text>
                            </View>
                            <View style={styles.menuUserDetails}>
                                <Text style={styles.menuUserName} numberOfLines={1}>{user?.name || 'User'}</Text>
                                <Text style={styles.menuUserRole} numberOfLines={1}>{user?.role?.replace('_', ' ')?.toUpperCase() || ''}</Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.menuCloseBtn}>
                            <Text style={styles.menuCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Menu Items */}
                    <ScrollView style={styles.menuItemsScroll}>
                        {menuItems.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.menuItemRow}
                                onPress={() => {
                                    onClose();
                                    if (onMenuPress) onMenuPress(item);
                                }}
                            >
                                <Text style={styles.menuItemIcon}>{item.icon}</Text>
                                <Text style={styles.menuItemTitle}>{item.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Logout at Bottom */}
                    <View style={styles.menuFooter}>
                        <TouchableOpacity
                            style={[styles.menuLogoutBtn, { backgroundColor: themeColor }]}
                            onPress={() => {
                                onClose();
                                if (onLogout) onLogout();
                            }}
                        >
                            <Text style={styles.menuLogoutText}>🚪 Logout</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        flexDirection: 'row',
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    menuContainer: {
        width: MENU_WIDTH,
        backgroundColor: 'white',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        flex: 1,
    },
    menuHeader: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    menuUserInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    menuAvatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuAvatarText: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
    },
    menuUserDetails: {
        flex: 1,
    },
    menuUserName: {
        color: 'white',
        fontSize: 17,
        fontWeight: 'bold',
    },
    menuUserRole: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginTop: 2,
    },
    menuCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuCloseText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    menuItemsScroll: {
        flex: 1,
        paddingTop: 10,
    },
    menuItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 22,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    menuItemIcon: {
        fontSize: 22,
        marginRight: 16,
        width: 30,
        textAlign: 'center',
    },
    menuItemTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: '#333',
    },
    menuFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    menuLogoutBtn: {
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    menuLogoutText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
});
