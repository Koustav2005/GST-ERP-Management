import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { projectsAPI } from '../config/api';

export default function MaterialsDetailScreen({ route, navigation }) {
  const { user } = route.params;
  const [materialsDetail, setMaterialsDetail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedMaterials, setExpandedMaterials] = useState({});

  useEffect(() => {
    fetchMaterialsDetail();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchMaterialsDetail();
    }, [])
  );

  const fetchMaterialsDetail = async () => {
    try {
      setLoading(true);
      if (user.company_id) {
        const response = await projectsAPI.getMaterialsDetail(user.company_id);
        setMaterialsDetail(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching materials detail:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMaterialsDetail();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Materials Detail</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9500" />
          <Text style={styles.loadingText}>Loading materials...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Materials Detail</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {materialsDetail.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No materials detail yet</Text>
            <Text style={styles.emptySubtext}>Accepted bid items will appear here</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Awarded Materials ({materialsDetail.length})</Text>
            {materialsDetail.map((material) => {
              const isExpanded = expandedMaterials[material.id];
              return (
                <TouchableOpacity
                  key={material.id}
                  style={styles.materialCard}
                  onPress={() => setExpandedMaterials({
                    ...expandedMaterials,
                    [material.id]: !isExpanded
                  })}
                >
                  <View style={styles.materialHeader}>
                    <View style={styles.materialBasicInfo}>
                      <Text style={styles.materialName}>{material.item_name}</Text>
                      <View style={styles.materialBasicDetails}>
                        {material.hsn && (
                          <Text style={styles.materialHSN}>HSN: {material.hsn}</Text>
                        )}
                        <Text style={styles.materialPrice}>Unit Price: ₹{material.unit_price}</Text>
                      </View>
                    </View>
                    <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                  </View>
                  
                  {isExpanded && (
                    <View style={styles.materialDetails}>
                      <Text style={styles.materialDetailText}>
                        Quantity: {material.quantity} {material.unit}
                      </Text>
                      <Text style={styles.materialDetailText}>
                        Total Price: ₹{material.total_price}
                      </Text>
                      {material.vendor_name && (
                        <Text style={styles.materialDetailText}>Vendor: {material.vendor_name}</Text>
                      )}
                      {material.vendor_gstin && (
                        <Text style={styles.materialDetailText}>Vendor GSTIN: {material.vendor_gstin}</Text>
                      )}
                      <Text style={styles.materialDetailText}>
                        Supply Until: {new Date(material.supply_until_date).toLocaleDateString()}
                      </Text>
                      {material.demand_title && (
                        <Text style={styles.materialDetailText}>
                          From Demand: {material.demand_title}
                        </Text>
                      )}
                      <Text style={styles.materialDate}>
                        Added: {new Date(material.created_at).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
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
  materialCard: {
    backgroundColor: 'white',
    marginBottom: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  materialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  materialBasicInfo: {
    flex: 1,
    marginRight: 10,
  },
  materialName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  materialBasicDetails: {
    flexDirection: 'row',
    gap: 15,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  materialHSN: {
    fontSize: 13,
    color: '#666',
  },
  materialPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
  },
  expandIcon: {
    fontSize: 12,
    color: '#999',
  },
  materialDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  materialDetailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    lineHeight: 20,
  },
  materialDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
    fontStyle: 'italic',
  },
});








