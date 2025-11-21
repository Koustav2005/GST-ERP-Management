import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function StoreInchargeDashboard({ user, onLogout }) {
  const inventory = [
    { item: 'Raw Materials', quantity: 450, unit: 'kg', status: 'Good' },
    { item: 'Finished Goods', quantity: 120, unit: 'units', status: 'Low' },
    { item: 'Packaging', quantity: 800, unit: 'pcs', status: 'Good' },
  ];

  const menuItems = [
    { title: 'Inventory', icon: '📦' },
    { title: 'Stock In', icon: '📥' },
    { title: 'Stock Out', icon: '📤' },
    { title: 'Reports', icon: '📊' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi,</Text>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.role}>Store Incharge</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>1,250</Text>
          <Text style={styles.statLabel}>Total Items</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>15</Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹8.5L</Text>
          <Text style={styles.statLabel}>Stock Value</Text>
        </View>
      </View>

      <View style={styles.alertCard}>
        <Text style={styles.alertIcon}>⚠️</Text>
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>Low Stock Alert</Text>
          <Text style={styles.alertText}>15 items need reordering</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Inventory Status</Text>
      {inventory.map((item, index) => (
        <View key={index} style={styles.inventoryCard}>
          <View style={styles.inventoryHeader}>
            <Text style={styles.inventoryName}>{item.item}</Text>
            <Text style={[styles.inventoryStatus, item.status === 'Low' && styles.statusLow]}>
              {item.status}
            </Text>
          </View>
          <Text style={styles.inventoryQuantity}>
            {item.quantity} {item.unit}
          </Text>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.menuGrid}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.menuItem}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuTitle}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#5856D6',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5856D6',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: '#FFF3CD',
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  alertIcon: {
    fontSize: 30,
    marginRight: 15,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  alertText: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
    marginTop: 10,
    marginBottom: 10,
    color: '#333',
  },
  inventoryCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  inventoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  inventoryStatus: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
  },
  statusLow: {
    color: '#FF3B30',
  },
  inventoryQuantity: {
    fontSize: 14,
    color: '#666',
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
});
