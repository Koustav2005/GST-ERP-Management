import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { projectsAPI } from '../config/api';
import Footer from '../components/Footer';

export default function ItemQRCodesScreen({ route, navigation }) {
  const { item, user } = route.params;
  const [barcodes, setBarcodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarcode, setSelectedBarcode] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    fetchBarcodes();
  }, []);

  const fetchBarcodes = async () => {
    try {
      setLoading(true);
      const response = await projectsAPI.getBarcodesByItem(item.item_name, user.company_id);
      const barcodesData = response.data.barcodes || [];
      
      // Parse quantity from barcode_data for each barcode
      const barcodesWithQuantity = barcodesData.map(barcode => {
        let quantity = null;
        try {
          // Try to extract quantity from JSON data in barcode_data
          const jsonMatch = barcode.barcode_data.match(/JSON Data: ({.*})/);
          if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[1]);
            quantity = jsonData.quantity || null;
          }
          // Also try to extract from the text format "Quantity: X"
          if (!quantity) {
            const quantityMatch = barcode.barcode_data.match(/Quantity:\s*(\d+)/);
            if (quantityMatch) {
              quantity = parseInt(quantityMatch[1]);
            }
          }
        } catch (e) {
          // If parsing fails, quantity remains null
          console.log('Error parsing quantity from barcode:', e);
        }
        
        return {
          ...barcode,
          quantity: quantity,
        };
      });
      
      setBarcodes(barcodesWithQuantity);
    } catch (error) {
      console.error('Error fetching barcodes:', error);
      if (error.response?.status === 404 || barcodes.length === 0) {
        // No QR codes found, that's okay
        setBarcodes([]);
      } else {
        Alert.alert('Error', 'Failed to load QR codes');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>QR Codes</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5856D6" />
          <Text style={styles.loadingText}>Loading QR codes...</Text>
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
        <Text style={styles.headerTitle}>QR Codes</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.item_name}</Text>
          {item.hsn && <Text style={styles.itemHSN}>HSN: {item.hsn}</Text>}
          <Text style={styles.itemQuantity}>
            Quantity: {item.quantity} {item.unit}
          </Text>
        </View>

        {barcodes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📱</Text>
            <Text style={styles.emptyText}>No QR codes found</Text>
            <Text style={styles.emptySubtext}>
              QR codes will appear here once they are generated for this item
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              QR Codes ({barcodes.length} {barcodes.length === 1 ? 'batch' : 'batches'})
            </Text>
            {barcodes.map((barcode, index) => (
              <View key={barcode.id} style={styles.qrCard}>
                <View style={styles.batchHeader}>
                  <View style={styles.batchInfo}>
                    <Text style={styles.batchTitle}>
                      Batch {index + 1} - Expiry: {new Date(barcode.exp_date).toLocaleDateString()}
                    </Text>
                    <Text style={styles.batchSubtitle}>
                      MFG: {new Date(barcode.mfg_date).toLocaleDateString()} | 
                      EXP: {new Date(barcode.exp_date).toLocaleDateString()}
                      {barcode.quantity && ` | Quantity: ${barcode.quantity} items`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.qrCodeSmall}
                    onPress={() => {
                      setSelectedBarcode(barcode);
                      setShowQRModal(true);
                    }}
                  >
                    <QRCode
                      value={barcode.barcode_data}
                      size={60}
                      color="#000000"
                      backgroundColor="#FFFFFF"
                      quietZone={2}
                    />
                    {barcode.qr_number && (
                      <Text style={styles.qrNumberSmall}>{barcode.qr_number}</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.scanHint}>
                  📱 Tap the QR code to view in full size
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Modal for Large QR Code */}
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>QR Code</Text>
              <TouchableOpacity
                onPress={() => setShowQRModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {selectedBarcode && (
              <>
                <View style={styles.modalQRContainer}>
                  <View style={styles.qrCodeWrapper}>
                    <QRCode
                      value={selectedBarcode.barcode_data}
                      size={250}
                      color="#000000"
                      backgroundColor="#FFFFFF"
                      quietZone={10}
                    />
                    {selectedBarcode.qr_number && (
                      <View style={styles.qrNumberOverlay}>
                        <Text style={styles.qrNumberValue}>{selectedBarcode.qr_number}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.modalInfo}>
                  {selectedBarcode.quantity && (
                    <Text style={styles.modalInfoText}>
                      Quantity: {selectedBarcode.quantity} items
                    </Text>
                  )}
                  <Text style={styles.modalInfoText}>
                    MFG: {new Date(selectedBarcode.mfg_date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.modalInfoText}>
                    EXP: {new Date(selectedBarcode.exp_date).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.modalScanHint}>
                  📱 Scan this QR code with any device to view item details
                </Text>
                {selectedBarcode.qr_number && (
                  <Text style={styles.modalScanHint}>
                    Or enter QR number "{selectedBarcode.qr_number}" to view details
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
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
  itemInfo: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  itemName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  itemHSN: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
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
  qrCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  batchInfo: {
    flex: 1,
    marginRight: 15,
  },
  batchTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  batchSubtitle: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  qrCodeSmall: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  qrNumberSmall: {
    fontSize: 9,
    color: '#5856D6',
    fontWeight: 'bold',
    marginTop: 3,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  modalQRContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    width: '100%',
  },
  modalInfo: {
    width: '100%',
    marginBottom: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  modalInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalScanHint: {
    fontSize: 12,
    color: '#5856D6',
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
  qrCodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
  },
  qrCodeWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrNumberOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  qrNumberValue: {
    fontSize: 12,
    color: '#5856D6',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  barcodeInfo: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  barcodeInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  scanHint: {
    fontSize: 12,
    color: '#5856D6',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});

