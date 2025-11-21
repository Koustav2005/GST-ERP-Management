import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function SalesExecutiveDashboard({ user, onLogout }) {
  const leads = [
    { name: 'ABC Corp', value: '₹2.5L', status: 'Hot' },
    { name: 'XYZ Industries', value: '₹1.8L', status: 'Warm' },
    { name: 'Tech Solutions', value: '₹3.2L', status: 'Hot' },
  ];

  const menuItems = [
    { title: 'Leads', icon: '🎯' },
    { title: 'Clients', icon: '👥' },
    { title: 'Orders', icon: '📦' },
    { title: 'Reports', icon: '📊' },
    { title: 'Quotations', icon: '📄' },
    { title: 'Follow-ups', icon: '📞' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hey,</Text>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.role}>Sales Executive</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>₹12.5L</Text>
          <Text style={styles.statLabel}>Monthly Sales</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>25</Text>
          <Text style={styles.statLabel}>Active Leads</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>18</Text>
          <Text style={styles.statLabel}>Closed Deals</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Hot Leads</Text>
      {leads.map((lead, index) => (
        <View key={index} style={styles.leadCard}>
          <View style={styles.leadHeader}>
            <Text style={styles.leadName}>{lead.name}</Text>
            <Text style={[styles.leadStatus, lead.status === 'Hot' && styles.statusHot]}>
              {lead.status}
            </Text>
          </View>
          <Text style={styles.leadValue}>Deal Value: {lead.value}</Text>
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
    backgroundColor: '#FF2D55',
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
    color: '#FF2D55',
  },
  statLabel: {
    fontSize: 11,
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
  leadCard: {
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
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  leadStatus: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#FFF3E0',
    borderRadius: 4,
  },
  statusHot: {
    color: '#FF3B30',
    backgroundColor: '#FFEBEE',
  },
  leadValue: {
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
