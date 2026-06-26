import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { projectsAPI } from '../config/api';
import Footer from '../components/Footer';

export default function InventoryScreen({ route, navigation }) {
  const { user } = route.params;
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchInventory();
    }, [])
  );

  const fetchInventory = async () => {
    try {
      setLoading(true);
      if (!user.company_id) {
        console.error('Company ID is missing');
        return;
      }
      const response = await projectsAPI.getInventory(user.company_id);
      const inventoryData = response.data.inventory || [];
      setInventory(inventoryData);
      filterInventory(inventoryData, searchQuery);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      if (error.message === 'Network Error') {
        console.error('Network Error: Please check if the backend server is running');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterInventory = (inventoryData, query) => {
    if (!query.trim()) {
      setFilteredInventory(inventoryData);
      return;
    }

    const lowerQuery = query.toLowerCase().trim();
    const filtered = inventoryData.filter(item => {
      const itemName = (item.item_name || '').toLowerCase();
      const hsn = (item.hsn || '').toLowerCase();
      return itemName.includes(lowerQuery) || hsn.includes(lowerQuery);
    });

    setFilteredInventory(filtered);
  };

  useEffect(() => {
    filterInventory(inventory, searchQuery);
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInventory();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inventory</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5856D6" />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
        <Footer />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inventory</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by item name or HSN..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(text)}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {filteredInventory.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No items found' : 'No inventory items'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery 
                ? 'Try searching with a different name or HSN' 
                : 'Items will appear here after receipts are submitted'}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              Items ({filteredInventory.length}{searchQuery ? ` of ${inventory.length}` : ''})
            </Text>
            {filteredInventory.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ItemQRCodes', { 
                    item: item,
                    user: user 
                  })}
                  style={styles.itemContent}
                >
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemName}>{item.item_name}</Text>
                    {item.hsn && (
                      <Text style={styles.itemHSN}>HSN: {item.hsn}</Text>
                    )}
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemQuantity}>
                      {item.quantity} {item.unit}
                    </Text>
                    <Text style={styles.itemQuantityLabel}>Available</Text>
                  </View>
                </TouchableOpacity>
                <Text style={styles.itemDate}>
                  Last Updated: {new Date(item.last_updated_at).toLocaleString()}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      <Footer />
    </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 5,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    paddingLeft: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  clearButton: {
    marginLeft: 10,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  emptyContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 40,
    alignItems: 'center',
    marginTop: 50,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#5856D6',
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemLeft: {
    flex: 1,
    marginRight: 15,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  itemHSN: {
    fontSize: 14,
    color: '#666',
  },
  itemRight: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  itemQuantity: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5856D6',
    marginBottom: 2,
  },
  itemQuantityLabel: {
    fontSize: 11,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

