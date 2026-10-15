import { Linking, Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '../config/api';
import { notify } from './jobwork';

// ---- status labels / colours ----
export const WO_STATUS = {
  awaiting_material: { label: 'Awaiting material', color: '#8E8E93' },
  open: { label: 'Open', color: '#007AFF' },
  in_process: { label: 'In process', color: '#FF9500' },
  ready: { label: 'Ready', color: '#5856D6' },
  partially_dispatched: { label: 'Partially dispatched', color: '#AF52DE' },
  closed: { label: 'Closed', color: '#28A745' },
};

export const DISPATCH_STATUS = {
  draft: { label: 'Draft', color: '#8E8E93' },
  issued: { label: 'Issued', color: '#28A745' },
  cancelled: { label: 'Cancelled', color: '#FF3B30' },
};

export const DOC_KINDS = [
  { value: 'drawing', label: 'Drawing' },
  { value: 'quotation', label: 'Quotation' },
  { value: 'inspection_report', label: 'Inspection report' },
  { value: 'customer_po', label: 'Customer PO' },
  { value: 'other', label: 'Other' },
];

// ---- numbers ----
// Money / quantities come from the server as strings; show them without changing digits.
export const q3 = (v) => (v === undefined || v === null || v === '' ? '-' : String(Number(v)));

// ---- files ----
// Pick a document or an image from the device. Returns { uri, name, type } or null.
export async function pickFile(types = ['application/pdf', 'image/*']) {
  const res = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true });
  if (res.canceled || !res.assets || !res.assets.length) return null;
  const a = res.assets[0];
  return { uri: a.uri, name: a.name || 'file', type: a.mimeType || 'application/octet-stream' };
}

// Take a photo with the camera. Returns { uri, name, type } or null.
export async function takePhoto() {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    notify('Camera permission needed', 'Allow camera access in the phone settings to take a photo.');
    return null;
  }
  const res = await ImagePicker.launchCameraAsync({ quality: 0.6 });
  if (res.canceled || !res.assets || !res.assets.length) return null;
  const a = res.assets[0];
  return { uri: a.uri, name: a.fileName || `photo-${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg' };
}

// ---- printed documents ----
// Download a PDF from the server (with the login token) and open the share sheet (save / WhatsApp / print / mail).
export async function downloadAndSharePdf(apiPath, fileName) {
  if (Platform.OS === 'web') {
    notify('Not available on web', 'Open the app on a phone or tablet to download and share the PDF.');
    return;
  }
  const token = await AsyncStorage.getItem('token');
  const base = await getApiUrl();
  const safe = String(fileName || 'document').replace(/[^A-Za-z0-9._-]+/g, '_');
  const target = `${FileSystem.cacheDirectory}${safe}.pdf`;
  const res = await FileSystem.downloadAsync(`${base}${apiPath}`, target, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (res.status !== 200) {
    let message = 'Could not create the PDF.';
    try {
      const body = JSON.parse(await FileSystem.readAsStringAsync(res.uri));
      if (body && body.error) message = body.error;
    } catch (e) { /* not JSON */ }
    await FileSystem.deleteAsync(res.uri, { idempotent: true });
    throw new Error(message);
  }
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(res.uri, { mimeType: 'application/pdf', dialogTitle: safe });
}

// ---- acknowledgment message (S2) ----
export async function shareAcknowledgment(ack) {
  await Share.share({ title: ack.subject, message: `${ack.subject}\n\n${ack.body}` });
}

export async function mailAcknowledgment(ack) {
  const can = await Linking.canOpenURL(ack.mailto);
  if (!can) throw new Error('No email app is set up on this device. Use Share / copy instead.');
  await Linking.openURL(ack.mailto);
}
