import { Alert, Platform } from 'react-native';

// Alert.alert does nothing on Expo web, so fall back to window.alert there.
export function notify(title, message) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

// Turn an axios error into a message a user can act on.
export function apiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  if (!error.response) {
    if (error.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
    return 'Cannot reach the server. Check your connection and that the backend is running.';
  }
  const { status, data } = error.response;
  const serverMessage = data && (data.error || data.message);
  if (status === 403) return serverMessage || 'You do not have permission to do this.';
  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 404) return serverMessage || 'That record was not found.';
  if (status === 409) return serverMessage || 'This conflicts with something that already exists.';
  return serverMessage || fallback;
}

// Append a picked file to FormData on both native (uri object) and web (needs a Blob).
export async function appendFile(formData, field, file) {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    formData.append(field, blob, file.name);
  } else {
    formData.append(field, {
      uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
      name: file.name,
      type: file.type,
    });
  }
}

export const DC_STATUS = {
  dc_created: { label: 'Created', color: '#8E8E93' },
  rejected: { label: 'Rejected', color: '#FF3B30' },
  approved: { label: 'Approved', color: '#007AFF' },
  dispatched: { label: 'Dispatched', color: '#FF9500' },
  partially_returned: { label: 'Partially returned', color: '#AF52DE' },
  closed: { label: 'Closed', color: '#28A745' },
};

export const money = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '-';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const qty = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : '-';
};

export const fmtDate = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v).slice(0, 10) : d.toLocaleDateString('en-IN');
};

export const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Keep typed text numeric: digits and one dot, limited decimals.
export const cleanDecimal = (text, decimals) => {
  let t = String(text).replace(/[^0-9.]/g, '');
  const firstDot = t.indexOf('.');
  if (firstDot !== -1) {
    t = t.slice(0, firstDot + 1) + t.slice(firstDot + 1).replace(/\./g, '');
    t = t.slice(0, firstDot + 1 + decimals);
  }
  return t;
};

export const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
