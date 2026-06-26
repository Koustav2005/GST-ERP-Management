import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

export default function OrderTypeSelectionScreen({ route, navigation }) {
  const { user } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Raise Order</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.infoText}>
          Select the type of order you want to place
        </Text>

        <TouchableOpacity
          style={styles.orderTypeCard}
          onPress={() => navigation.navigate('MajorOrder', { user })}
        >
          <Text style={styles.orderTypeIcon}>📋</Text>
          <Text style={styles.orderTypeTitle}>Major Order</Text>
          <Text style={styles.orderTypeDescription}>
            Order from contracted vendors. Item details will be auto-fetched from saved materials.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.orderTypeCard}
          onPress={() => navigation.navigate('MinorOrderOptions', { user })}
        >
          <Text style={styles.orderTypeIcon}>📝</Text>
          <Text style={styles.orderTypeTitle}>Minor Order</Text>
          <Text style={styles.orderTypeDescription}>
            Open order for all vendors to bid. You can select the best vendor after reviewing bids.
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FF9500',
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
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  orderTypeCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 5,
    borderLeftColor: '#FF9500',
  },
  orderTypeIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  orderTypeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  orderTypeDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

