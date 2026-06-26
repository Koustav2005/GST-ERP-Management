import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { projectsAPI } from '../config/api';

export default function SearchQRCodeScreen({ route, navigation }) {
  const { user } = route.params || {};
  const [qrNumber, setQrNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [barcodeData, setBarcodeData] = useState(null);

  const handleSearch = async () => {
    if (!qrNumber.trim()) {
      Alert.alert('Error', 'Please enter a QR number');
      return;
    }

    setLoading(true);
    try {
      const response = await projectsAPI.getBarcodeByQrNumber(qrNumber.trim().toUpperCase());
      setBarcodeData(response.data.barcode);
    } catch (error) {
      console.error('Error fetching QR code:', error);
      if (error.response?.status === 404) {
        Alert.alert('Not Found', 'QR code not found. Please check the QR number and try again.');
      } else {
        Alert.alert('Error', 'Failed to fetch QR code details. Please try again.');
      }
      setBarcodeData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search QR Code</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.searchCard}>
          <Text style={styles.searchTitle}>Enter QR Number</Text>
          <Text style={styles.searchHint}>
            Enter the QR number displayed below the QR code
          </Text>
          <TextInput
            style={styles.searchInput}
            placeholder="e.g., QR00000001"
            value={qrNumber}
            onChangeText={(text) => setQrNumber(text.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={loading || !qrNumber.trim()}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.searchButtonText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        {barcodeData && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Item Details</Text>
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>QR Number:</Text>
                <Text style={styles.detailValue}>{barcodeData.qr_number}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Item Name:</Text>
                <Text style={styles.detailValue}>{barcodeData.item_name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>HSN:</Text>
                <Text style={styles.detailValue}>{barcodeData.hsn || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Purchased Date:</Text>
                <Text style={styles.detailValue}>
                  {new Date(barcodeData.purchased_date).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Manufacturing Date:</Text>
                <Text style={styles.detailValue}>
                  {new Date(barcodeData.mfg_date).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Expiry Date:</Text>
                <Text style={styles.detailValue}>
                  {new Date(barcodeData.exp_date).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Generated On:</Text>
                <Text style={styles.detailValue}>
                  {new Date(barcodeData.created_at).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
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
  content: {
    flex: 1,
    padding: 15,
  },
  searchCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  searchHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    marginBottom: 15,
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: '600',
  },
  searchButton: {
    backgroundColor: '#5856D6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  detailsContainer: {
    marginTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
});







