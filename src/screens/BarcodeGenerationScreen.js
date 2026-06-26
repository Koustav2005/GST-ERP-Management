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
  Platform,
  Modal,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Footer from '../components/Footer';

export default function BarcodeGenerationScreen({ route, navigation }) {
  const { item, order, user } = route.params || {};

  // Auto-fill data
  const itemName = item?.item_name || order?.item_name || '';
  const hsn = item?.hsn || order?.hsn || '';
  const purchasedDate = order?.order_date ? new Date(order.order_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  const [hasExpiryDate, setHasExpiryDate] = useState(null); // null = not selected, true/false
  const [noExpiryNote, setNoExpiryNote] = useState(''); // Optional note when no expiry
  const [mfgDate, setMfgDate] = useState('');
  const [expDate, setExpDate] = useState('');
  const [hasDifferentExpDates, setHasDifferentExpDates] = useState(null);
  const [numberOfDates, setNumberOfDates] = useState('');
  const [expDates, setExpDates] = useState([]);
  const [mfgDates, setMfgDates] = useState([]);
  const [quantities, setQuantities] = useState([]); // Number of items per batch
  const [singleQuantity, setSingleQuantity] = useState('1'); // For single batch
  const [materialInfo, setMaterialInfo] = useState('');
  const [singleBatchNumber, setSingleBatchNumber] = useState('');
  const [batchNumbers, setBatchNumbers] = useState([]);
  const [barcodeData, setBarcodeData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [existingBarcode, setExistingBarcode] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [barcodesNeedingQuantity, setBarcodesNeedingQuantity] = useState([]);
  const [quantityInputs, setQuantityInputs] = useState({});

  // Check if barcode already exists
  React.useEffect(() => {
    const checkExistingBarcode = async () => {
      if (order?.id) {
        try {
          const { projectsAPI } = require('../config/api');
          const response = await projectsAPI.getBarcode(order.id);

          // Handle both single barcode and multiple barcodes response
          if (response.data.barcode) {
            // Single barcode (backward compatibility)
            const singleBarcode = response.data.barcode;
            setExistingBarcode(singleBarcode);
            setMfgDate(singleBarcode.mfg_date);
            setExpDate(singleBarcode.exp_date);
            // Check if quantity exists in barcode_data
            let quantity = null;
            try {
              const jsonMatch = response.data.barcode.barcode_data.match(/JSON Data: ({.*})/);
              if (jsonMatch) {
                const jsonData = JSON.parse(jsonMatch[1]);
                quantity = jsonData.quantity || null;
              }
            } catch (e) {
              // If parsing fails, quantity is null
            }

            const barcodeObj = {
              data: response.data.barcode.barcode_data,
              itemName: response.data.barcode.item_name,
              hsn: response.data.barcode.hsn,
              purchasedDate: response.data.barcode.purchased_date,
              mfgDate: response.data.barcode.mfg_date,
              expDate: response.data.barcode.exp_date,
              qrNumber: response.data.barcode.qr_number,
              barcodeId: response.data.barcode.id,
              quantity: quantity,
            };

            // If quantity is missing, show modal
            if (quantity === null) {
              setBarcodesNeedingQuantity([barcodeObj]);
              setShowQuantityModal(true);
              setQuantityInputs({ [barcodeObj.qrNumber]: '1' });
            }

            setBarcodeData(barcodeObj);
          } else if (response.data.barcodes && response.data.barcodes.length > 0) {
            // Multiple barcodes
            setExistingBarcode(true); // Set to true to indicate barcodes exist
            const barcodesArray = response.data.barcodes.map((barcode, index) => {
              // Check if quantity exists in barcode_data
              let quantity = null;
              try {
                const jsonMatch = barcode.barcode_data.match(/JSON Data: ({.*})/);
                if (jsonMatch) {
                  const jsonData = JSON.parse(jsonMatch[1]);
                  quantity = jsonData.quantity || null;
                }
              } catch (e) {
                // If parsing fails, quantity is null
              }

              return {
                data: barcode.barcode_data,
                itemName: barcode.item_name,
                hsn: barcode.hsn,
                purchasedDate: barcode.purchased_date,
                mfgDate: barcode.mfg_date,
                expDate: barcode.exp_date,
                qrNumber: barcode.qr_number,
                barcodeId: barcode.id,
                quantity: quantity,
              };
            });

            // Check if any barcode is missing quantity
            const missingQuantity = barcodesArray.filter(b => b.quantity === null);
            if (missingQuantity.length > 0) {
              setBarcodesNeedingQuantity(missingQuantity);
              setShowQuantityModal(true);
              // Initialize quantity inputs
              const inputs = {};
              missingQuantity.forEach(b => {
                inputs[b.qrNumber] = '1';
              });
              setQuantityInputs(inputs);
            }

            setBarcodeData(barcodesArray.length === 1 ? barcodesArray[0] : barcodesArray);
          }
        } catch (error) {
          // Barcode doesn't exist yet, that's fine
          if (error.response && error.response.status === 404) {
            console.log('No existing barcode found');
          } else {
             console.error('Error fetching barcode:', error);
          }
        }
      }
      setLoading(false);
    };
    checkExistingBarcode();
  }, [order]);

  const handleExpDateChange = (index, value) => {
    const updatedDates = [...expDates];
    updatedDates[index] = value;
    setExpDates(updatedDates);
  };

  const handleMfgDateChange = (index, value) => {
    const updatedDates = [...mfgDates];
    updatedDates[index] = value;
    setMfgDates(updatedDates);
  };

  const handleQuantityChange = (index, value) => {
    const updatedQuantities = [...quantities];
    updatedQuantities[index] = value;
    setQuantities(updatedQuantities);
  };

  const handleBatchNumberChange = (index, value) => {
    const updatedBatchNumbers = [...batchNumbers];
    updatedBatchNumbers[index] = value;
    setBatchNumbers(updatedBatchNumbers);
  };

  const validateAndShowConfirm = () => {
    if (!itemName || !hsn) {
      Alert.alert('Error', 'Item name and HSN are required');
      return;
    }

    if (hasExpiryDate === null) {
      Alert.alert('Error', 'Please select whether the item has an expiry date');
      return;
    }

    // No expiry date - only batch number and note (both optional), just confirm
    if (hasExpiryDate === false) {
      // Validate quantity
      if (!singleQuantity || parseInt(singleQuantity) <= 0) {
        Alert.alert('Error', 'Please enter how many items');
        return;
      }
      setShowConfirmModal(true);
      return;
    }

    // Has expiry date - check the rest
    if (hasDifferentExpDates === null) {
      Alert.alert('Error', 'Please select whether items have different expiry dates');
      return;
    }

    if (hasDifferentExpDates === false) {
      // Single batch - need manufacturing date
      if (!mfgDate) {
        Alert.alert('Error', 'Please enter manufacturing date');
        return;
      }
      const mfgDateObj = new Date(mfgDate);
      if (isNaN(mfgDateObj.getTime())) {
        Alert.alert('Error', 'Invalid manufacturing date format. Use YYYY-MM-DD');
        return;
      }
      // Single expiry date
      if (!expDate) {
        Alert.alert('Error', 'Please enter expiry date');
        return;
      }
      const expDateObj = new Date(expDate);
      if (isNaN(expDateObj.getTime())) {
        Alert.alert('Error', 'Invalid expiry date format. Use YYYY-MM-DD');
        return;
      }
      if (expDateObj <= mfgDateObj) {
        Alert.alert('Error', 'Expiry date must be after manufacturing date');
        return;
      }
      // Validate quantity
      if (!singleQuantity || parseInt(singleQuantity) <= 0) {
        Alert.alert('Error', 'Please enter number of items with this MFG and EXP date');
        return;
      }
    } else {
      // Multiple expiry dates - each must have its own manufacturing date
      if (!numberOfDates || parseInt(numberOfDates) <= 0) {
        Alert.alert('Error', 'Please enter number of different expiry dates');
        return;
      }
      const numDates = parseInt(numberOfDates);
      if (expDates.length !== numDates) {
        Alert.alert('Error', `Please enter all ${numDates} expiry dates`);
        return;
      }
      if (mfgDates.length !== numDates) {
        Alert.alert('Error', `Please enter all ${numDates} manufacturing dates`);
        return;
      }
      if (quantities.length !== numDates) {
        Alert.alert('Error', `Please enter quantity for all ${numDates} batches`);
        return;
      }
      // Validate all dates and quantities
      for (let i = 0; i < expDates.length; i++) {
        if (!expDates[i]) {
          Alert.alert('Error', `Please enter expiry date ${i + 1}`);
          return;
        }
        if (!mfgDates[i]) {
          Alert.alert('Error', `Please enter manufacturing date ${i + 1}`);
          return;
        }
        if (!quantities[i] || parseInt(quantities[i]) <= 0) {
          Alert.alert('Error', `Please enter number of items for batch ${i + 1}`);
          return;
        }
        const expDateObj = new Date(expDates[i]);
        const mfgDateObjForItem = new Date(mfgDates[i]);
        if (isNaN(expDateObj.getTime())) {
          Alert.alert('Error', `Invalid expiry date format for date ${i + 1}. Use YYYY-MM-DD`);
          return;
        }
        if (isNaN(mfgDateObjForItem.getTime())) {
          Alert.alert('Error', `Invalid manufacturing date format for date ${i + 1}. Use YYYY-MM-DD`);
          return;
        }
        if (expDateObj <= mfgDateObjForItem) {
          Alert.alert('Error', `Expiry date ${i + 1} must be after manufacturing date ${i + 1}`);
          return;
        }
      }
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const generateBarcode = async () => {
    setShowConfirmModal(false);
    setGenerating(true);

    try {
      const { projectsAPI } = require('../config/api');
      const generatedBarcodes = [];

      if (hasExpiryDate === false) {
        // No expiry date - generate ONE QR code with batch number and note only
        const quantity = parseInt(singleQuantity) || 1;

        const qrCodeString = `ITEM DETAILS
Item Name: ${itemName}
HSN: ${hsn || 'N/A'}
Purchased Date: ${purchasedDate}
Expiry: No Expiry
Quantity: ${quantity}
Batch Number: ${singleBatchNumber || 'N/A'}
Note: ${noExpiryNote || 'N/A'}
Material Info: ${materialInfo || 'N/A'}

JSON Data: ${JSON.stringify({
          item_name: itemName,
          hsn: hsn,
          purchased_date: purchasedDate,
          mfg_date: null,
          exp_date: null,
          has_expiry: false,
          quantity: quantity,
          batch_number: singleBatchNumber || null,
          note: noExpiryNote || null,
          material_info: materialInfo || null,
        })}`;

        let savedBarcode = null;
        if (order?.id && user?.company_id) {
          const barcodePayload = {
            company_id: user.company_id,
            item_name: itemName,
            hsn: hsn,
            purchased_date: purchasedDate,
            mfg_date: null,
            exp_date: null,
            barcode_data: qrCodeString,
            batch_number: singleBatchNumber || null,
            material_info: materialInfo || null,
          };

          if (order.order_type === 'legacy') {
            barcodePayload.order_id = order.id;
          } else {
            barcodePayload.purchase_order_id = order.purchase_order_id;
            barcodePayload.purchase_order_item_id = order.id;
          }

          const saveResponse = await projectsAPI.saveBarcode(barcodePayload);
          savedBarcode = saveResponse.data.barcode;
        }

        generatedBarcodes.push({
          data: qrCodeString,
          itemName,
          hsn,
          purchasedDate,
          mfgDate: 'N/A',
          expDate: 'No Expiry',
          quantity: quantity,
          qrNumber: savedBarcode?.qr_number || null,
        });
      } else if (hasDifferentExpDates === false) {
        // Single batch - generate ONE QR code with quantity information
        const quantity = parseInt(singleQuantity);
        if (!quantity || quantity <= 0) {
          Alert.alert('Error', 'Please enter a valid number of items');
          setGenerating(false);
          return;
        }

        const qrCodeString = `ITEM DETAILS
Item Name: ${itemName}
HSN: ${hsn || 'N/A'}
Purchased Date: ${purchasedDate}
Manufacturing Date: ${mfgDate}
Expiry Date: ${expDate}
Quantity: ${quantity}
Batch Number: ${singleBatchNumber || 'N/A'}
Material Info: ${materialInfo || 'N/A'}

JSON Data: ${JSON.stringify({
          item_name: itemName,
          hsn: hsn,
          purchased_date: purchasedDate,
          mfg_date: mfgDate,
          exp_date: expDate,
          quantity: quantity,
          batch_number: singleBatchNumber || null,
          material_info: materialInfo || null,
        })}`;

        let savedBarcode = null;
        if (order?.id && user?.company_id) {
          const barcodePayload = {
            company_id: user.company_id,
            item_name: itemName,
            hsn: hsn,
            purchased_date: purchasedDate,
            mfg_date: mfgDate,
            exp_date: expDate,
            barcode_data: qrCodeString,
            batch_number: singleBatchNumber || null,
            material_info: materialInfo || null,
          };

          if (order.order_type === 'legacy') {
            barcodePayload.order_id = order.id;
          } else {
            barcodePayload.purchase_order_id = order.purchase_order_id;
            barcodePayload.purchase_order_item_id = order.id;
          }

          const saveResponse = await projectsAPI.saveBarcode(barcodePayload);
          savedBarcode = saveResponse.data.barcode;
        }

        generatedBarcodes.push({
          data: qrCodeString,
          itemName,
          hsn,
          purchasedDate,
          mfgDate: mfgDate,
          expDate: expDate,
          quantity: quantity,
          qrNumber: savedBarcode?.qr_number || null,
        });
      } else {
        // Multiple batches - generate ONE QR code per batch with quantity information
        for (let i = 0; i < expDates.length; i++) {
          const currentExpDate = expDates[i];
          const currentMfgDate = mfgDates[i];
          const quantity = parseInt(quantities[i]);
          if (!quantity || quantity <= 0) {
            Alert.alert('Error', `Please enter a valid number of items for batch ${i + 1}`);
            setGenerating(false);
            return;
          }

          // Generate ONE QR code for this batch with quantity
          const currentBatchNumber = batchNumbers[i];
          const qrCodeString = `ITEM DETAILS
Item Name: ${itemName}
HSN: ${hsn || 'N/A'}
Purchased Date: ${purchasedDate}
Manufacturing Date: ${currentMfgDate}
Expiry Date: ${currentExpDate}
Quantity: ${quantity}
Batch Number: ${currentBatchNumber || 'N/A'}
Material Info: ${materialInfo || 'N/A'}

JSON Data: ${JSON.stringify({
            item_name: itemName,
            hsn: hsn,
            purchased_date: purchasedDate,
            mfg_date: currentMfgDate,
            exp_date: currentExpDate,
            quantity: quantity,
            batch_number: currentBatchNumber || null,
            material_info: materialInfo || null,
          })}`;

          let savedBarcode = null;
          if (order?.id && user?.company_id) {
            const barcodePayload = {
              company_id: user.company_id,
              item_name: itemName,
              hsn: hsn,
              purchased_date: purchasedDate,
              mfg_date: currentMfgDate,
              exp_date: currentExpDate,
              barcode_data: qrCodeString,
              batch_number: currentBatchNumber || null,
              material_info: materialInfo || null,
            };

            if (order.order_type === 'legacy') {
              barcodePayload.order_id = order.id;
            } else {
              barcodePayload.purchase_order_id = order.purchase_order_id;
              barcodePayload.purchase_order_item_id = order.id;
            }

            const saveResponse = await projectsAPI.saveBarcode(barcodePayload);
            savedBarcode = saveResponse.data.barcode;
          }

          generatedBarcodes.push({
            data: qrCodeString,
            itemName,
            hsn,
            purchasedDate,
            mfgDate: currentMfgDate,
            expDate: currentExpDate,
            quantity: quantity,
            qrNumber: savedBarcode?.qr_number || null,
          });
        }
      }

      // Set QR code data for display (show first one, or all if multiple)
      setBarcodeData(generatedBarcodes.length === 1 ? generatedBarcodes[0] : generatedBarcodes);

      // Mark as existing barcode to hide input fields
      setExistingBarcode(true);

      setGenerating(false);
      const totalCount = generatedBarcodes.length;
      const successMessage = totalCount === 1
        ? '1 QR Code generated and saved successfully!'
        : `${totalCount} QR Codes generated and saved successfully!`;
      Alert.alert('Success', successMessage);
    } catch (error) {
      console.error('Error saving barcode:', error);
      setGenerating(false);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save QR code. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Barcode</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5856D6" />
          <Text style={styles.loadingText}>Loading...</Text>
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
        <Text style={styles.headerTitle}>
          {existingBarcode ? 'View QR Code' : 'Generate QR Code'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {existingBarcode && (
        <View style={styles.existingBanner}>
          <Text style={styles.existingBannerText}>
            ✓ QR Code(s) already generated for this item
          </Text>
        </View>
      )}

      <ScrollView style={styles.content}>
        {!existingBarcode && (
          <>
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Item Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Item Name:</Text>
                <Text style={styles.infoValue}>{itemName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>HSN:</Text>
                <Text style={styles.infoValue}>{hsn || 'N/A'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Purchased Date:</Text>
                <Text style={styles.infoValue}>{purchasedDate}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>QR Code Details</Text>
          </>
        )}

        {existingBarcode && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Item Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Item Name:</Text>
              <Text style={styles.infoValue}>{itemName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>HSN:</Text>
              <Text style={styles.infoValue}>{hsn || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Purchased Date:</Text>
              <Text style={styles.infoValue}>{purchasedDate}</Text>
            </View>
          </View>
        )}

        {!existingBarcode && (
          <>
            {/* Step 1: Does item have expiry date? */}
            <View style={styles.inputCard}>
              <Text style={styles.label}>Does this item have an expiry date? *</Text>
              <View style={styles.radioContainer}>
                <TouchableOpacity
                  style={[styles.radioOption, hasExpiryDate === true && styles.radioOptionSelected]}
                  onPress={() => {
                    setHasExpiryDate(true);
                    setHasDifferentExpDates(null);
                    setNoExpiryNote('');
                  }}
                >
                  <Text style={[styles.radioText, hasExpiryDate === true && styles.radioTextSelected]}>
                    Yes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioOption, hasExpiryDate === false && styles.radioOptionSelected]}
                  onPress={() => {
                    setHasExpiryDate(false);
                    setHasDifferentExpDates(null);
                    setExpDate('');
                    setExpDates([]);
                    setMfgDates([]);
                    setMfgDate('');
                    setNumberOfDates('');
                    setSingleQuantity('1');
                  }}
                >
                  <Text style={[styles.radioText, hasExpiryDate === false && styles.radioTextSelected]}>
                    No
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* No expiry date path: Batch Number + Note (optional) + Quantity */}
            {hasExpiryDate === false && (
              <>
                <View style={styles.inputCard}>
                  <Text style={styles.label}>Batch Number (Optional)</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="Enter Batch Number"
                    value={singleBatchNumber}
                    onChangeText={setSingleBatchNumber}
                    keyboardType="default"
                  />
                </View>
                <View style={styles.inputCard}>
                  <Text style={styles.label}>Note (Optional)</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="Enter any additional notes"
                    value={noExpiryNote}
                    onChangeText={setNoExpiryNote}
                    keyboardType="default"
                    multiline
                  />
                </View>
                <View style={styles.inputCard}>
                  <Text style={styles.label}>Material Information / Grade (Optional)</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="Enter Material Grade or Info"
                    value={materialInfo}
                    onChangeText={setMaterialInfo}
                    keyboardType="default"
                  />
                </View>
                <View style={styles.inputCard}>
                  <Text style={styles.label}>How many items? *</Text>
                  <Text style={styles.dateHint}>Enter the total number of items</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="Enter number (e.g., 5)"
                    value={singleQuantity}
                    onChangeText={setSingleQuantity}
                    keyboardType="numeric"
                  />
                </View>
              </>
            )}

            {/* Has expiry date path: ask if multiple or single */}
            {hasExpiryDate === true && (
              <>
                <View style={styles.inputCard}>
                  <Text style={styles.label}>Do items have different expiry dates? *</Text>
                  <View style={styles.radioContainer}>
                    <TouchableOpacity
                      style={[styles.radioOption, hasDifferentExpDates === true && styles.radioOptionSelected]}
                      onPress={() => {
                        setHasDifferentExpDates(true);
                        setExpDate('');
                        setExpDates([]);
                        setMfgDates([]);
                        setMfgDate('');
                        setNumberOfDates('');
                      }}
                    >
                      <Text style={[styles.radioText, hasDifferentExpDates === true && styles.radioTextSelected]}>
                        Yes
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.radioOption, hasDifferentExpDates === false && styles.radioOptionSelected]}
                      onPress={() => {
                        setHasDifferentExpDates(false);
                        setExpDates([]);
                        setMfgDates([]);
                        setQuantities([]);
                        setNumberOfDates('');
                        setSingleQuantity('1');
                      }}
                    >
                      <Text style={[styles.radioText, hasDifferentExpDates === false && styles.radioTextSelected]}>
                        No
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputCard}>
                  <Text style={styles.label}>Material Information / Grade (Optional)</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="Enter Material Grade or Info"
                    value={materialInfo}
                    onChangeText={setMaterialInfo}
                    keyboardType="default"
                  />
                </View>

                {hasDifferentExpDates === false && (
                  <>
                    <View style={styles.inputCard}>
                      <Text style={styles.label}>Batch Number (Optional)</Text>
                      <TextInput
                        style={styles.dateInput}
                        placeholder="Enter Batch Number"
                        value={singleBatchNumber}
                        onChangeText={setSingleBatchNumber}
                        keyboardType="default"
                      />
                    </View>
                    <View style={styles.inputCard}>
                      <Text style={styles.label}>Manufacturing Date *</Text>
                      <Text style={styles.dateHint}>Format: YYYY-MM-DD (e.g., 2024-01-15)</Text>
                      <TextInput
                        style={styles.dateInput}
                        placeholder="YYYY-MM-DD"
                        value={mfgDate}
                        onChangeText={setMfgDate}
                        keyboardType="default"
                      />
                    </View>
                    <View style={styles.inputCard}>
                      <Text style={styles.label}>Expiry Date *</Text>
                      <Text style={styles.dateHint}>Format: YYYY-MM-DD (e.g., 2025-01-15)</Text>
                      <TextInput
                        style={styles.dateInput}
                        placeholder="YYYY-MM-DD"
                        value={expDate}
                        onChangeText={setExpDate}
                        keyboardType="default"
                      />
                    </View>
                    <View style={styles.inputCard}>
                      <Text style={styles.label}>How many items will be of this MFG and EXP date? *</Text>
                      <Text style={styles.dateHint}>Enter the number of items with the same manufacturing and expiry dates</Text>
                      <TextInput
                        style={styles.dateInput}
                        placeholder="Enter number (e.g., 5)"
                        value={singleQuantity}
                        onChangeText={setSingleQuantity}
                        keyboardType="numeric"
                      />
                    </View>
                  </>
                )}

                {hasDifferentExpDates === true && (
                  <>
                    <View style={styles.inputCard}>
                      <Text style={styles.label}>Number of Different Expiry Dates *</Text>
                      <Text style={styles.dateHint}>How many different expiry dates do you have?</Text>
                      <TextInput
                        style={styles.dateInput}
                        placeholder="Enter number (e.g., 3)"
                        value={numberOfDates}
                        onChangeText={(text) => {
                          const num = parseInt(text) || 0;
                          setNumberOfDates(text);
                          // Initialize expDates, mfgDates, and quantities arrays
                          if (num > 0 && num !== expDates.length) {
                            const newExpDates = Array(num).fill('');
                            const newMfgDates = Array(num).fill('');
                            const newQuantities = Array(num).fill('1');
                            const newBatchNumbers = Array(num).fill('');
                            // Preserve existing dates and quantities if any
                            for (let i = 0; i < Math.min(num, expDates.length); i++) {
                              newExpDates[i] = expDates[i] || '';
                              newMfgDates[i] = mfgDates[i] || '';
                              newQuantities[i] = quantities[i] || '1';
                              newBatchNumbers[i] = batchNumbers[i] || '';
                            }
                            setExpDates(newExpDates);
                            setMfgDates(newMfgDates);
                            setQuantities(newQuantities);
                            setBatchNumbers(newBatchNumbers);
                          }
                        }}
                        keyboardType="numeric"
                      />
                    </View>

                    {parseInt(numberOfDates) > 0 && expDates.map((date, index) => (
                      <View key={index} style={styles.inputCard}>
                        <Text style={styles.label}>Batch {index + 1} - Batch Number (Optional)</Text>
                        <TextInput
                          style={styles.dateInput}
                          placeholder={`Enter Batch Number ${index + 1}`}
                          value={batchNumbers[index] || ''}
                          onChangeText={(text) => handleBatchNumberChange(index, text)}
                          keyboardType="default"
                        />
                        <Text style={[styles.label, { marginTop: 15 }]}>Batch {index + 1} - Manufacturing Date *</Text>
                        <Text style={styles.dateHint}>Format: YYYY-MM-DD (e.g., 2024-01-15)</Text>
                        <TextInput
                          style={styles.dateInput}
                          placeholder={`YYYY-MM-DD (MFG Date ${index + 1})`}
                          value={mfgDates[index] || ''}
                          onChangeText={(text) => handleMfgDateChange(index, text)}
                          keyboardType="default"
                        />
                        <Text style={[styles.label, { marginTop: 15 }]}>Batch {index + 1} - Expiry Date *</Text>
                        <Text style={styles.dateHint}>Format: YYYY-MM-DD (e.g., 2025-01-15)</Text>
                        <TextInput
                          style={styles.dateInput}
                          placeholder={`YYYY-MM-DD (EXP Date ${index + 1})`}
                          value={date}
                          onChangeText={(text) => handleExpDateChange(index, text)}
                          keyboardType="default"
                        />
                        <Text style={[styles.label, { marginTop: 15 }]}>How many items will be of this MFG and EXP date? *</Text>
                        <Text style={styles.dateHint}>Enter the number of items for batch {index + 1}</Text>
                        <TextInput
                          style={styles.dateInput}
                          placeholder={`Enter number (e.g., 3)`}
                          value={quantities[index] || ''}
                          onChangeText={(text) => handleQuantityChange(index, text)}
                          keyboardType="numeric"
                        />
                      </View>
                    ))}
                  </>
                )}
              </>
            )}

            <TouchableOpacity
              style={styles.generateButton}
              onPress={validateAndShowConfirm}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.generateButtonText}>Generate QR Code</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {barcodeData && (
          <>
            {Array.isArray(barcodeData) ? (
              // Multiple QR codes
              barcodeData.map((barcode, index) => (
                <View key={index} style={styles.barcodeCard}>
                  <Text style={styles.barcodeTitle}>QR Code {index + 1} (Batch {index + 1})</Text>
                  <Text style={styles.barcodeSubtitle}>
                    MFG: {barcode.mfgDate} | EXP: {barcode.expDate} | Quantity: {barcode.quantity || 1}
                  </Text>
                  <View style={styles.qrCodeContainer}>
                    <View style={styles.qrCodeWrapper}>
                      <QRCode
                        value={barcode.data}
                        size={250}
                        color="#000000"
                        backgroundColor="#FFFFFF"
                        quietZone={10}
                      />
                      {barcode.qrNumber && (
                        <View style={styles.qrNumberOverlay}>
                          <Text style={styles.qrNumberValue}>{barcode.qrNumber}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.barcodeInfo}>
                    <Text style={styles.barcodeInfoText}>Item: {barcode.itemName}</Text>
                    <Text style={styles.barcodeInfoText}>HSN: {barcode.hsn}</Text>
                    <Text style={styles.barcodeInfoText}>Purchased: {barcode.purchasedDate}</Text>
                    <Text style={styles.barcodeInfoText}>MFG: {barcode.mfgDate}</Text>
                    <Text style={styles.barcodeInfoText}>EXP: {barcode.expDate}</Text>
                    <Text style={styles.barcodeInfoText}>Quantity: {barcode.quantity || 1} items</Text>
                  </View>
                  <Text style={styles.scanHint}>
                    📱 Scan this QR code with any device to view item details
                  </Text>
                  {barcode.qrNumber && (
                    <Text style={styles.scanHint}>
                      Or enter QR number "{barcode.qrNumber}" to view details
                    </Text>
                  )}
                </View>
              ))
            ) : (
              // Single QR code
              <View style={styles.barcodeCard}>
                <Text style={styles.barcodeTitle}>Generated QR Code</Text>
                <View style={styles.qrCodeContainer}>
                  <View style={styles.qrCodeWrapper}>
                    <QRCode
                      value={barcodeData.data}
                      size={250}
                      color="#000000"
                      backgroundColor="#FFFFFF"
                      quietZone={10}
                    />
                    {barcodeData.qrNumber && (
                      <View style={styles.qrNumberOverlay}>
                        <Text style={styles.qrNumberValue}>{barcodeData.qrNumber}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.barcodeInfo}>
                  <Text style={styles.barcodeInfoText}>Item: {barcodeData.itemName}</Text>
                  <Text style={styles.barcodeInfoText}>HSN: {barcodeData.hsn}</Text>
                  <Text style={styles.barcodeInfoText}>Purchased: {barcodeData.purchasedDate}</Text>
                  <Text style={styles.barcodeInfoText}>MFG: {barcodeData.mfgDate}</Text>
                  <Text style={styles.barcodeInfoText}>EXP: {barcodeData.expDate}</Text>
                  <Text style={styles.barcodeInfoText}>Quantity: {barcodeData.quantity || 1} items</Text>
                </View>
                <Text style={styles.scanHint}>
                  📱 Scan this QR code with any device to view item details
                </Text>
                {barcodeData.qrNumber && (
                  <Text style={styles.scanHint}>
                    Or enter QR number "{barcodeData.qrNumber}" to view details
                  </Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm QR Code Generation</Text>
            <Text style={styles.modalSubtitle}>Please review the details before generating:</Text>

            <View style={styles.confirmInfoCard}>
              <View style={styles.confirmInfoRow}>
                <Text style={styles.confirmLabel}>Item Name:</Text>
                <Text style={styles.confirmValue}>{itemName}</Text>
              </View>
              <View style={styles.confirmInfoRow}>
                <Text style={styles.confirmLabel}>HSN:</Text>
                <Text style={styles.confirmValue}>{hsn || 'N/A'}</Text>
              </View>
              <View style={styles.confirmInfoRow}>
                <Text style={styles.confirmLabel}>Purchased Date:</Text>
                <Text style={styles.confirmValue}>{purchasedDate}</Text>
              </View>
              {hasExpiryDate === false ? (
                <>
                  <View style={styles.confirmInfoRow}>
                    <Text style={styles.confirmLabel}>Expiry:</Text>
                    <Text style={styles.confirmValue}>No Expiry Date</Text>
                  </View>
                  <View style={styles.confirmInfoRow}>
                    <Text style={styles.confirmLabel}>Batch Number:</Text>
                    <Text style={styles.confirmValue}>{singleBatchNumber || 'N/A'}</Text>
                  </View>
                  {noExpiryNote ? (
                    <View style={styles.confirmInfoRow}>
                      <Text style={styles.confirmLabel}>Note:</Text>
                      <Text style={styles.confirmValue}>{noExpiryNote}</Text>
                    </View>
                  ) : null}
                  <View style={styles.confirmInfoRow}>
                    <Text style={styles.confirmLabel}>Number of Items:</Text>
                    <Text style={styles.confirmValue}>{singleQuantity}</Text>
                  </View>
                  <View style={styles.confirmInfoRow}>
                    <Text style={styles.confirmLabel}>QR Code to Generate:</Text>
                    <Text style={styles.confirmValue}>1 (for {singleQuantity} items)</Text>
                  </View>
                </>
              ) : hasDifferentExpDates === false ? (
                <>
                  <View style={styles.confirmInfoRow}>
                    <Text style={styles.confirmLabel}>Manufacturing Date:</Text>
                    <Text style={styles.confirmValue}>{mfgDate}</Text>
                  </View>
                  <View style={styles.confirmInfoRow}>
                    <Text style={styles.confirmLabel}>Expiry Date:</Text>
                    <Text style={styles.confirmValue}>{expDate}</Text>
                  </View>
                  <View style={styles.confirmInfoRow}>
                    <Text style={styles.confirmLabel}>Number of Items:</Text>
                    <Text style={styles.confirmValue}>{singleQuantity}</Text>
                  </View>
                  <View style={styles.confirmInfoRow}>
                    <Text style={styles.confirmLabel}>QR Code to Generate:</Text>
                    <Text style={styles.confirmValue}>1 (for {singleQuantity} items)</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.confirmInfoRow}>
                    <Text style={styles.confirmLabel}>Number of Batches:</Text>
                    <Text style={styles.confirmValue}>{numberOfDates}</Text>
                  </View>
                  {expDates.map((date, index) => {
                    const qty = parseInt(quantities[index]) || 0;
                    return (
                      <View key={index}>
                        <View style={styles.confirmInfoRow}>
                          <Text style={styles.confirmLabel}>Batch {index + 1} - Manufacturing Date:</Text>
                          <Text style={styles.confirmValue}>{mfgDates[index]}</Text>
                        </View>
                        <View style={styles.confirmInfoRow}>
                          <Text style={styles.confirmLabel}>Batch {index + 1} - Expiry Date:</Text>
                          <Text style={styles.confirmValue}>{date}</Text>
                        </View>
                        <View style={styles.confirmInfoRow}>
                          <Text style={styles.confirmLabel}>Batch {index + 1} - Number of Items:</Text>
                          <Text style={styles.confirmValue}>{quantities[index]}</Text>
                        </View>
                      </View>
                    );
                  })}
                  <View style={styles.confirmInfoRow}>
                    <Text style={styles.confirmLabel}>Total QR Codes to Generate:</Text>
                    <Text style={styles.confirmValue}>
                      {quantities.length} QR Code{quantities.length > 1 ? 's' : ''} ({quantities.map((qty, idx) => `Batch ${idx + 1}: ${qty} items`).join(', ')})
                    </Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={generateBarcode}
              >
                <Text style={styles.modalButtonText}>Confirm & Generate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Quantity Input Modal for Existing QR Codes */}
      <Modal
        visible={showQuantityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => { }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Quantity for QR Codes</Text>
            <Text style={styles.modalSubtitle}>
              Please enter how many items have the same MFG and EXP date for each QR code:
            </Text>

            <ScrollView style={styles.quantityScrollView}>
              {barcodesNeedingQuantity.map((barcode, index) => (
                <View key={barcode.qrNumber || index} style={styles.quantityInputCard}>
                  <Text style={styles.quantityCardTitle}>QR Code {index + 1}</Text>
                  <Text style={styles.quantityCardSubtitle}>
                    MFG: {barcode.mfgDate} | EXP: {barcode.expDate}
                  </Text>
                  <Text style={styles.quantityLabel}>
                    How many items have this MFG and EXP date? *
                  </Text>
                  <TextInput
                    style={styles.quantityInput}
                    placeholder="Enter number (e.g., 3)"
                    value={quantityInputs[barcode.qrNumber] || ''}
                    onChangeText={(text) => {
                      setQuantityInputs(prev => ({
                        ...prev,
                        [barcode.qrNumber]: text
                      }));
                    }}
                    keyboardType="numeric"
                  />
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={async () => {
                  // Validate all inputs
                  let allValid = true;
                  for (const barcode of barcodesNeedingQuantity) {
                    const qty = parseInt(quantityInputs[barcode.qrNumber]);
                    if (!qty || qty <= 0) {
                      allValid = false;
                      Alert.alert('Error', `Please enter a valid quantity for QR Code ${barcodesNeedingQuantity.indexOf(barcode) + 1}`);
                      break;
                    }
                  }

                  if (!allValid) return;

                  // Update each QR code with quantity
                  try {
                    const { projectsAPI } = require('../config/api');
                    for (const barcode of barcodesNeedingQuantity) {
                      const quantity = parseInt(quantityInputs[barcode.qrNumber]);

                      // Parse existing barcode data
                      let qrCodeString = barcode.data;

                      // Check if quantity already exists in the string
                      if (!qrCodeString.includes('Quantity:')) {
                        // Add quantity to the string
                        const lines = qrCodeString.split('\n');
                        const expDateLineIndex = lines.findIndex(line => line.startsWith('Expiry Date:'));
                        if (expDateLineIndex >= 0) {
                          lines.splice(expDateLineIndex + 1, 0, `Quantity: ${quantity}`);
                        } else {
                          // If structure is different, append at the end before JSON
                          const jsonIndex = lines.findIndex(line => line.startsWith('JSON Data:'));
                          if (jsonIndex >= 0) {
                            lines.splice(jsonIndex, 0, `Quantity: ${quantity}`);
                          }
                        }
                        qrCodeString = lines.join('\n');
                      }

                      // Update JSON data
                      const jsonMatch = qrCodeString.match(/JSON Data: ({.*})/);
                      if (jsonMatch) {
                        try {
                          const jsonData = JSON.parse(jsonMatch[1]);
                          jsonData.quantity = quantity;
                          qrCodeString = qrCodeString.replace(/JSON Data: {.*}/, `JSON Data: ${JSON.stringify(jsonData)}`);
                        } catch (e) {
                          // If JSON parsing fails, add quantity to JSON manually
                          const jsonStr = JSON.stringify({
                            item_name: barcode.itemName,
                            hsn: barcode.hsn,
                            purchased_date: barcode.purchasedDate,
                            mfg_date: barcode.mfgDate,
                            exp_date: barcode.expDate,
                            quantity: quantity,
                          });
                          qrCodeString = qrCodeString.replace(/JSON Data: {.*}/, `JSON Data: ${jsonStr}`);
                        }
                      } else {
                        // If no JSON found, create new structure
                        qrCodeString = `ITEM DETAILS
Item Name: ${barcode.itemName}
HSN: ${barcode.hsn || 'N/A'}
Purchased Date: ${barcode.purchasedDate}
Manufacturing Date: ${barcode.mfgDate}
Expiry Date: ${barcode.expDate}
Quantity: ${quantity}

JSON Data: ${JSON.stringify({
                          item_name: barcode.itemName,
                          hsn: barcode.hsn,
                          purchased_date: barcode.purchasedDate,
                          mfg_date: barcode.mfgDate,
                          exp_date: barcode.expDate,
                          quantity: quantity,
                        })}`;
                      }

                      // Update barcode in backend
                      await projectsAPI.updateBarcode(barcode.barcodeId, {
                        barcode_data: qrCodeString
                      });

                      // Update local barcode data
                      if (Array.isArray(barcodeData)) {
                        const updated = barcodeData.map(b =>
                          b.qrNumber === barcode.qrNumber
                            ? { ...b, data: qrCodeString, quantity: quantity }
                            : b
                        );
                        setBarcodeData(updated);
                      } else if (barcodeData?.qrNumber === barcode.qrNumber) {
                        setBarcodeData({ ...barcodeData, data: qrCodeString, quantity: quantity });
                      }
                    }

                    setShowQuantityModal(false);
                    setBarcodesNeedingQuantity([]);
                    setQuantityInputs({});
                    Alert.alert('Success', 'Quantity information updated successfully!');
                  } catch (error) {
                    console.error('Error updating quantities:', error);
                    Alert.alert('Error', 'Failed to update quantity information. Please try again.');
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Save Quantities</Text>
              </TouchableOpacity>
            </View>
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
  content: {
    flex: 1,
    padding: 15,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  inputCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
    marginTop: 5,
  },
  dateHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontStyle: 'italic',
  },
  generateButton: {
    backgroundColor: '#5856D6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  barcodeCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginTop: 20,
    marginBottom: 30,
  },
  barcodeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  barcodeSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
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
  radioContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  radioOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },
  radioOptionSelected: {
    borderColor: '#5856D6',
    backgroundColor: '#e8e8ff',
  },
  radioText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  radioTextSelected: {
    color: '#5856D6',
    fontWeight: '600',
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
  existingBanner: {
    backgroundColor: '#34C759',
    padding: 12,
    alignItems: 'center',
  },
  existingBannerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  regenerateButton: {
    backgroundColor: '#FF9500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmInfoCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  confirmInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  confirmInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  confirmLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    flex: 1,
  },
  confirmValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#ccc',
  },
  modalButtonConfirm: {
    backgroundColor: '#5856D6',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  quantityScrollView: {
    maxHeight: 400,
    marginBottom: 20,
  },
  quantityInputCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  quantityCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  quantityCardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  quantityLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '600',
  },
  quantityInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
});

