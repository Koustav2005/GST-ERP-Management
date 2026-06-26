import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { projectsAPI } from '../config/api';

export default function OrderReceiptScreen({ route, navigation }) {
  const { order, user } = route.params;
  const [billImages, setBillImages] = useState([]); // [{uri, caption}]
  const [items, setItems] = useState(
    order.items ? order.items.map(item => ({
      ...item,
      quantity_ordered: item.quantity,
      quantity_received: '',
    })) : [
      {
        item_name: order.item_name,
        hsn: order.hsn || '',
        quantity_ordered: order.quantity,
        quantity_received: '',
        unit: order.unit,
      }
    ]
  );
  const [grossWeight, setGrossWeight] = useState('');
  const [tareWeight, setTareWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaValue, setCaptchaValue] = useState('');
  const [captchaCode, setCaptchaCode] = useState(() => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    return { num1, num2, answer: num1 + num2 };
  });
  const [receiptExists, setReceiptExists] = useState(false);
  const [partialReceipt, setPartialReceipt] = useState(null);
  const [checkingReceipt, setCheckingReceipt] = useState(true);

  // Check if receipt already exists for this order
  React.useEffect(() => {
    const checkReceipt = async () => {
      try {
        const response = await projectsAPI.getOrderReceipts(user.company_id);
        const allReceipts = response.data.receipts || [];
        const orderReceipts = allReceipts.filter(r =>
          (order.order_type === 'legacy' && r.order_id === order.id) ||
          (order.order_type === 'purchase_order' && r.purchase_order_id === order.purchase_order_id)
        );

        if (orderReceipts.length > 0) {
          const latestReceipt = orderReceipts[0];
          if (latestReceipt.receipt_status === 'complete') {
            setReceiptExists(true);
          } else {
            setPartialReceipt(latestReceipt);
            const totalPrevReceived = orderReceipts.reduce(
              (sum, r) => sum + (parseFloat(r.total_quantity_received) || 0), 0
            );
            const qtyOrdered = parseFloat(order.quantity) || 0;
            const remaining = Math.max(0, qtyOrdered - totalPrevReceived);
            // We do not set the quantity_received so the user has to do a blind count
          }
        } else {
          // If no previous receipt, default to empty to force blind receipt count
        }
      } catch (error) {
        console.error('Error checking receipt:', error);
      } finally {
        setCheckingReceipt(false);
      }
    };
    checkReceipt();
  }, [order.id, order.purchase_order_id, user.company_id]);

  const pickBillImage = async (source) => {
    if (receiptExists) return;
    let result;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, quality: 0.8 });
    }
    if (!result.canceled && result.assets) {
      const newImages = result.assets.map(a => ({ uri: a.uri, caption: '' }));
      setBillImages(prev => [...prev, ...newImages]);
    }
  };

  const updateBillCaption = (index, text) => {
    setBillImages(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], caption: text };
      return updated;
    });
  };

  const removeBillImage = (index) => {
    setBillImages(prev => prev.filter((_, i) => i !== index));
  };


  const handleItemChange = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index][field] = value;
    setItems(updatedItems);
  };

  const handleSubmit = () => {
    if (receiptExists) return;

    if (billImages.length === 0) {
      Alert.alert('Error', 'Please add at least one bill image');
      return;
    }

    // Validate: at least one of quantity received OR vehicle weight details
    const hasQuantityReceived = items.some(
      item => item.quantity_received && parseFloat(item.quantity_received) > 0
    );
    const hasVehicleWeight =
      (grossWeight && parseFloat(grossWeight) > 0) ||
      (tareWeight && parseFloat(tareWeight) > 0);

    if (!hasQuantityReceived && !hasVehicleWeight) {
      Alert.alert(
        'Validation Error',
        'Please fill in at least one of the following:\n• Quantity Received (for any item)\n• Vehicle Weight Details (Gross or Tare weight)'
      );
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = () => {
    setShowConfirmModal(false);
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaCode({ num1, num2, answer: num1 + num2 });
    setCaptchaValue('');
    setShowCaptcha(true);
  };

  const handleCaptchaCheck = () => {
    if (parseInt(captchaValue) === captchaCode.answer) {
      handleCaptchaVerify();
    } else {
      Alert.alert('Error', 'Incorrect captcha. Please try again.');
      setCaptchaValue('');
      const num1 = Math.floor(Math.random() * 10) + 1;
      const num2 = Math.floor(Math.random() * 10) + 1;
      setCaptchaCode({ num1, num2, answer: num1 + num2 });
    }
  };

  const handleCaptchaVerify = async () => {
    setShowCaptcha(false);
    setSubmitting(true);

    try {
      const formData = new FormData();

      if (order.order_type === 'legacy') {
        formData.append('order_id', order.id);
      } else {
        formData.append('purchase_order_id', order.purchase_order_id);
      }
      formData.append('company_id', user.company_id);
      formData.append('submitted_by', user.id);

      const computedNetWeight = (parseFloat(grossWeight) || 0) - (parseFloat(tareWeight) || 0);
      if (grossWeight && parseFloat(grossWeight) > 0) {
        formData.append('gross_weight', parseFloat(grossWeight));
      }
      if (tareWeight && parseFloat(tareWeight) > 0) {
        formData.append('tare_weight', parseFloat(tareWeight));
      }
      if (computedNetWeight > 0) {
        formData.append('net_weight', computedNetWeight);
      }
      formData.append('vehicle_weight_unit', weightUnit);

      // Bill images - send for the entire PO
      billImages.forEach((img, idx) => {
        const filename = img.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        formData.append(idx === 0 ? 'bill' : `bill_${idx}`, {
          uri: img.uri,
          name: filename,
          type: type,
        });
      });
      // Send captions
      formData.append('bill_captions', JSON.stringify(billImages.map(img => img.caption)));

      // Items — store incharge only sends qty (all prices/GST entered by Accountant)
      const mappedItems = items.map(item => ({
        order_id: item.order_type === 'legacy' ? item.id : null,
        purchase_order_item_id: item.order_type === 'purchase_order' ? item.id : (item.purchase_order_id ? item.id : null),
        item_name: item.item_name,
        hsn: item.hsn,
        quantity_ordered: parseFloat(item.quantity_ordered) || 0, 
        quantity_received: parseFloat(item.quantity_received) || 0,
        unit: item.unit,
        gst_rate: 0,
        unit_price: 0,
        gst_amount: 0,
        total_amount: 0,
      }));
      formData.append('items', JSON.stringify(mappedItems));

      const result = await projectsAPI.submitOrderReceipt(formData);
      const receiptStatus = result.data?.receipt_status || 'complete';

      Alert.alert(
        'Success',
        receiptStatus === 'complete'
          ? '✅ Receipt submitted! Order fully received.\n\nPlease generate a QR code for inventory tracking.'
          : '🕐 Receipt submitted! Order partially received.\n\nPlease generate a QR code for inventory tracking.',
        [{ text: 'OK', onPress: () => {
          navigation.replace('BarcodeGeneration', {
            item: { item_name: order.item_name, hsn: order.hsn },
            order: order,
            user: user
          });
        }}]
      );
    } catch (error) {
      console.error('Error submitting receipt:', error);
      const errorMessage = error.response?.data?.error || 'Failed to submit receipt';
      if (errorMessage.includes('already submitted') || errorMessage.includes('fully received')) {
        Alert.alert(
          'Already Submitted',
          errorMessage,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const calculatedNetWeight = (parseFloat(grossWeight) || 0) - (parseFloat(tareWeight) || 0);

  if (checkingReceipt) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Receipt</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5856D6" />
          <Text style={styles.loadingText}>Loading...</Text>
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
        <Text style={styles.headerTitle}>Order Receipt</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Fully received — block re-submission */}
      {receiptExists && (
        <View style={styles.alreadySubmittedBanner}>
          <Text style={styles.alreadySubmittedText}>
            ✅ Order fully received. No further receipt submission allowed.
          </Text>
        </View>
      )}

      {/* Partial receipt — allow re-submission with info banner */}
      {!receiptExists && partialReceipt && (
        <View style={styles.partialReceiptBanner}>
          <Text style={styles.partialReceiptTitle}>🕐 Previous Partial Receipt Found</Text>
          <Text style={styles.partialReceiptText}>
            A partial quantity was already received. Please fill in the remaining quantity below.
          </Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        {/* Order info */}
        {/* Bill Images */}
        <Text style={styles.sectionTitle}>Physical Bill Upload *</Text>
        {!receiptExists && (
          <View style={styles.billPickRow}>
            <TouchableOpacity style={styles.billPickBtn} onPress={() => pickBillImage('camera')}>
              <Text style={styles.billPickBtnIcon}>📷</Text>
              <Text style={styles.billPickBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.billPickBtn} onPress={() => pickBillImage('gallery')}>
              <Text style={styles.billPickBtnIcon}>🖼️</Text>
              <Text style={styles.billPickBtnText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {billImages.length === 0 && (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>📄</Text>
            <Text style={styles.imagePlaceholderLabel}>Please upload the master bill for the delivery</Text>
          </View>
        )}

        {billImages.map((img, index) => (
          <View key={index} style={styles.billImageCard}>
            <View style={styles.billImageRow}>
              <Image source={{ uri: img.uri }} style={styles.billImagePreview} />
              <View style={styles.billImageInfo}>
                <Text style={styles.billImageLabel}>Bill Page {index + 1}</Text>
                <TextInput
                  style={styles.billCaptionInput}
                  placeholder="Caption (optional)"
                  value={img.caption}
                  onChangeText={(text) => updateBillCaption(index, text)}
                  editable={!receiptExists}
                />
              </View>
              {!receiptExists && (
                <TouchableOpacity
                  style={styles.billImageDeleteBtn}
                  onPress={() => removeBillImage(index)}
                >
                  <Text style={styles.billImageDeleteText}>❌</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {/* Vehicle Weight */}
        <Text style={styles.sectionTitle}>Vehicle Weight Details (Optional)</Text>
        <View style={styles.itemCard}>
          <Text style={styles.label}>Weight Unit</Text>
          <View style={[styles.pickerContainer, receiptExists && styles.disabledInput]}>
            <Picker
              selectedValue={weightUnit}
              onValueChange={(itemValue) => setWeightUnit(itemValue)}
              enabled={!receiptExists}
            >
              <Picker.Item label="Kilograms (kg)" value="kg" />
              <Picker.Item label="Metric Tons (MT)" value="MT" />
              <Picker.Item label="Tons (t)" value="tons" />
              <Picker.Item label="Quintals (q)" value="quintals" />
              <Picker.Item label="Grams (g)" value="g" />
              <Picker.Item label="Liters (L)" value="L" />
              <Picker.Item label="Pounds (lbs)" value="lbs" />
            </Picker>
          </View>

          <Text style={styles.label}>Gross Weight ({weightUnit})</Text>
          <TextInput
            style={[styles.input, receiptExists && styles.disabledInput]}
            placeholder="Enter Gross Vehicle Weight"
            value={grossWeight}
            onChangeText={setGrossWeight}
            keyboardType="numeric"
            editable={!receiptExists}
          />

          <Text style={styles.label}>Tare Weight ({weightUnit})</Text>
          <TextInput
            style={[styles.input, receiptExists && styles.disabledInput]}
            placeholder="Enter Tare Vehicle Weight"
            value={tareWeight}
            onChangeText={setTareWeight}
            keyboardType="numeric"
            editable={!receiptExists}
          />

          {calculatedNetWeight > 0 && (
            <View style={styles.calculationBox}>
              <Text style={styles.totalText}>
                Net Weight: {calculatedNetWeight.toFixed(2)} {weightUnit}
              </Text>
            </View>
          )}
        </View>

        {/* Items */}
        <Text style={styles.sectionTitle}>Items Received</Text>
        {items.map((item, index) => (
          <View key={index} style={styles.itemCard}>
            <Text style={styles.itemName}>{item.item_name}</Text>
            <Text style={styles.itemHSN}>HSN: {item.hsn || 'N/A'}</Text>
            <Text style={styles.itemOrdered}>
              Ordered: {item.quantity_ordered} {item.unit}
            </Text>

            <Text style={styles.label}>Quantity Received (Optional)</Text>
            <TextInput
              style={[styles.input, receiptExists && styles.disabledInput]}
              placeholder={`Enter quantity received in ${item.unit}`}
              value={item.quantity_received}
              onChangeText={(text) => handleItemChange(index, 'quantity_received', text)}
              keyboardType="numeric"
              editable={!receiptExists}
            />

            {/* Note: GST rate and Amount will be entered by Accountant */}
            <View style={styles.accountantNote}>
              <Text style={styles.accountantNoteText}>
                💼 GST rate, unit price & amount will be entered by Accountant
              </Text>
            </View>
          </View>
        ))}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, (submitting || receiptExists) && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitting || receiptExists}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : receiptExists ? (
            <Text style={styles.submitButtonText}>Already Submitted</Text>
          ) : (
            <Text style={styles.submitButtonText}>📤 Submit to Accounts</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmModalTitle}>Confirm Submission</Text>
            <Text style={styles.confirmModalSubtitle}>Please review all details before submitting:</Text>

            <ScrollView style={styles.confirmContent}>
              <View style={styles.confirmSection}>
                <Text style={styles.confirmSectionTitle}>Order Information</Text>
                <Text style={styles.confirmText}>Item: {order.item_name}</Text>
                {order.hsn && <Text style={styles.confirmText}>HSN: {order.hsn}</Text>}
                <Text style={styles.confirmText}>Quantity Ordered: {order.quantity} {order.unit}</Text>
                {order.vendor_name && <Text style={styles.confirmText}>Vendor: {order.vendor_name}</Text>}
              </View>

              <View style={styles.confirmSection}>
                <Text style={styles.confirmSectionTitle}>Items Received</Text>
                {items.map((item, index) => (
                  <View key={index} style={styles.confirmItemCard}>
                    <Text style={styles.confirmItemName}>{item.item_name}</Text>
                    <Text style={styles.confirmText}>HSN: {item.hsn || 'N/A'}</Text>
                    <Text style={styles.confirmText}>
                      Quantity Received: {item.quantity_received || '—'} {item.unit}
                    </Text>
                    <Text style={[styles.confirmText, { fontStyle: 'italic', color: '#888' }]}>
                      GST rate & amount: To be entered by Accountant
                    </Text>
                  </View>
                ))}
              </View>

              {(grossWeight || tareWeight) && (
                <View style={styles.confirmSection}>
                  <Text style={styles.confirmSectionTitle}>Vehicle Weight</Text>
                  {grossWeight ? <Text style={styles.confirmText}>Gross: {grossWeight} {weightUnit}</Text> : null}
                  {tareWeight ? <Text style={styles.confirmText}>Tare: {tareWeight} {weightUnit}</Text> : null}
                  {calculatedNetWeight > 0 && (
                    <Text style={styles.confirmText}>Net: {calculatedNetWeight.toFixed(2)} {weightUnit}</Text>
                  )}
                </View>
              )}

              <View style={styles.confirmSection}>
                <Text style={styles.confirmSectionTitle}>Bill Status</Text>
                <Text style={styles.confirmText}>✓ Uploaded at Purchase Order level</Text>
              </View>

              <View style={[styles.confirmSection, { backgroundColor: '#EBF5FB', borderRadius: 8, padding: 10 }]}>
                <Text style={[styles.confirmText, { color: '#1A5276', fontWeight: '600' }]}>
                  📱 A QR code will be auto-generated after submission for inventory tracking.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonCancel]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.confirmButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmButtonProceed]}
                onPress={handleConfirmSubmit}
              >
                <Text style={styles.confirmButtonText}>Proceed to Captcha</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Captcha Modal */}
      <Modal
        visible={showCaptcha}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCaptcha(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.captchaModal}>
            <Text style={styles.captchaTitle}>Verify Submission</Text>
            <Text style={styles.captchaQuestion}>
              What is {captchaCode.num1} + {captchaCode.num2}?
            </Text>
            <TextInput
              style={styles.captchaInput}
              placeholder="Enter answer"
              value={captchaValue}
              onChangeText={setCaptchaValue}
              keyboardType="numeric"
              autoFocus
            />
            <TouchableOpacity
              style={styles.captchaButton}
              onPress={handleCaptchaCheck}
            >
              <Text style={styles.captchaButtonText}>Verify & Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  alreadySubmittedBanner: {
    backgroundColor: '#34C759',
    padding: 15,
    alignItems: 'center',
  },
  alreadySubmittedText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  partialReceiptBanner: {
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
    padding: 15,
  },
  partialReceiptTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 4,
  },
  partialReceiptText: {
    fontSize: 13,
    color: '#856404',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  orderInfo: {
    backgroundColor: '#5856D6',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  orderTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  orderDetails: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    marginTop: 5,
  },
  imageContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#5856D6',
    borderStyle: 'dashed',
    minHeight: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  billImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    alignItems: 'center',
    padding: 30,
  },
  imagePlaceholderText: {
    fontSize: 40,
    marginBottom: 10,
  },
  imagePlaceholderLabel: {
    color: '#5856D6',
    fontSize: 16,
    fontWeight: '600',
  },
  billPickRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
  },
  billPickBtn: {
    flex: 1,
    backgroundColor: 'white',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#5856D6',
  },
  billPickBtnIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  billPickBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5856D6',
  },
  billImageCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  billImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billImagePreview: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  billImageInfo: {
    flex: 1,
    marginLeft: 12,
  },
  billImageLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#5856D6',
    marginBottom: 6,
  },
  billCaptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  billImageDeleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
  billImageDeleteText: {
    fontSize: 18,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemHSN: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  itemOrdered: {
    fontSize: 14,
    color: '#5856D6',
    fontWeight: '600',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    marginBottom: 12,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
  },
  calculationBox: {
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#5856D6',
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5856D6',
  },
  accountantNote: {
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  accountantNoteText: {
    fontSize: 12,
    color: '#856404',
    fontStyle: 'italic',
  },
  submitButton: {
    backgroundColor: '#5856D6',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  // ── Modals ────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    backgroundColor: 'white',
    borderRadius: 15,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  confirmModalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  confirmContent: {
    maxHeight: 400,
  },
  confirmSection: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  confirmSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5856D6',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confirmText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
  },
  confirmItemCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  confirmItemName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  confirmButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonCancel: {
    backgroundColor: '#ccc',
  },
  confirmButtonProceed: {
    backgroundColor: '#5856D6',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  captchaModal: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    width: '90%',
    alignItems: 'center',
  },
  captchaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  captchaQuestion: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5856D6',
    marginBottom: 20,
  },
  captchaInput: {
    borderWidth: 2,
    borderColor: '#5856D6',
    borderRadius: 8,
    padding: 12,
    fontSize: 20,
    width: '100%',
    textAlign: 'center',
    marginBottom: 15,
  },
  captchaButton: {
    backgroundColor: '#5856D6',
    padding: 14,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  captchaButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
