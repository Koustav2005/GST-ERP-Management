import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Smart API URL detection
export const getApiUrl = () => {
  // In development, automatically detect IP from Expo
  if (__DEV__) {
    // Try multiple methods to get the IP
    const expoConfig = Constants.expoConfig;
    const manifest = Constants.manifest;
    const manifest2 = Constants.manifest2;

    // Method 1: Try expoConfig.hostUri (Expo SDK 46+)
    let debuggerHost = expoConfig?.hostUri;

    // Method 2: Try manifest2.extra.expoGo.debuggerHost (Expo SDK 50+)
    if (!debuggerHost && manifest2?.extra?.expoGo) {
      debuggerHost = manifest2.extra.expoGo.debuggerHost;
    }

    // Method 3: Try manifest.debuggerHost (older Expo versions)
    if (!debuggerHost && manifest) {
      debuggerHost = manifest.debuggerHost;
    }

    // Method 4: Try Constants.debuggerHost
    if (!debuggerHost) {
      debuggerHost = Constants.debuggerHost;
    }

    console.log('🔍 Debug info:', {
      debuggerHost,
      hasExpoConfig: !!expoConfig,
      hasManifest: !!manifest,
      hasManifest2: !!manifest2,
    });

    if (debuggerHost) {
      const ip = debuggerHost.split(':')[0];
      console.log('✅ Auto-detected IP:', ip);
      return `http://${ip}:3000/api`;
    }

    // Fallback: Use manual IP (update this with your IP)
    const manualIP = '10.69.76.87'; // Update this if needed
    console.log('⚠️ Could not auto-detect IP, using manual IP:', manualIP);
    return `http://${manualIP}:3000/api`;
  }

  // Production API URL
  return 'https://api.yourcompany.com/api';
};

const API_BASE_URL = getApiUrl();

console.log('📡 API URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Increased timeout to 30 seconds
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  async (config) => {
    console.log('📤 API Request:', config.method?.toUpperCase(), config.url);

    // Add auth token if available
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token from storage:', error);
    }

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timeout - Backend server may be slow or not responding');
    } else if (error.message === 'Network Error') {
      console.error('🌐 Network Error - Possible causes:');
      console.error('   1. Backend server is not running');
      console.error('   2. Incorrect IP address in API configuration');
      console.error('   3. Firewall blocking port 3000');
      console.error('   4. Phone and computer not on same network');
      console.error('   Current API URL:', API_BASE_URL);
      console.error('   Try: cd backend && npm run dev');
    } else {
      console.error('❌ API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  // Auth endpoints
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  signup: (name, email, password, role, company_name, gst_number) =>
    api.post('/auth/signup', { name, email, password, role, company_name, gst_number }),

  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { email }),

  verifyResetToken: (token) =>
    api.get(`/auth/verify-reset-token/${token}`),

  resetPassword: (token, newPassword) =>
    api.post('/auth/reset-password', { token, newPassword }),

  logout: (userId) =>
    api.post('/auth/logout', { user_id: userId }),
};

export const companiesAPI = {
  getAll: () => api.get('/companies'),
  getById: (id) => api.get(`/companies/${id}`),
  create: (data) => api.post('/companies', data),
};

export const projectsAPI = {
  getByCompany: (companyId) => api.get(`/projects/company/${companyId}`),
  getNPDUsers: (companyId) => api.get(`/projects/npd-users/${companyId}`),
  getProjectManagers: (companyId) => api.get(`/projects/project-managers/${companyId}`),
  getMyProjects: (userId) => api.get(`/projects/my-projects/${userId}`),
  getNPDProjects: (userId) => api.get(`/projects/npd-projects/${userId}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getProjectDetails: (id) => api.get(`/projects/${id}`),
  getBOM: (projectId) => api.get(`/projects/${projectId}/bom`),
  addBOM: (projectId, data) => api.post(`/projects/${projectId}/bom`, data),
  deleteBOM: (projectId, materialId) => api.delete(`/projects/${projectId}/bom/${materialId}`),
  updateSketch: (id, sketchUrl) => api.put(`/projects/${id}/sketch`, { sketch_url: sketchUrl }),
  uploadSketch: (formData) => api.post('/projects/upload-sketch', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getHistory: (projectId) => api.get(`/projects/${projectId}/history`),
  addHistory: (projectId, data) => api.post(`/projects/${projectId}/history`, data),
  getInternalReports: (projectId) => api.get(`/projects/${projectId}/internal-reports`),
  uploadInternalReport: (projectId, formData) => api.post(`/projects/${projectId}/internal-reports`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  // Revisions API
  getRevisions: (projectId) => api.get(`/projects/${projectId}/revisions`),
  getRevision: (projectId, revisionId) => api.get(`/projects/${projectId}/revisions/${revisionId}`),
  createRevision: (projectId, data) => api.post(`/projects/${projectId}/revisions`, data),
  updateRevision: (projectId, revisionId, data) => api.put(`/projects/${projectId}/revisions/${revisionId}`, data),
  completeProject: (projectId, hsnCode) => api.post(`/projects/${projectId}/complete`, { hsn_code: hsnCode }),
  submitInspection: (projectId, data) => api.post(`/projects/${projectId}/inspect`, data),
  getSalesInventory: () => api.get('/projects/sales/inventory'),
  sellItem: (data) => api.post('/projects/sales/sell', data),
  getSalesInvoices: () => api.get('/projects/sales/invoices'),
  // Tax Calculator API
  addProjectExpense: (projectId, data) => api.post(`/projects/${projectId}/expenses`, data),
  getTaxSummary: (projectId) => api.get(`/projects/${projectId}/tax-summary`),
  // Notifications API
  // getNotifications: (userId) => api.get(`/projects/notifications/${userId}`), // Removed duplicate
  markNotificationRead: (notificationId) => api.put(`/projects/notifications/${notificationId}/read`),
  getUnreadCount: (userId) => api.get(`/projects/notifications/${userId}/unread-count`),
  // Requirements API
  getAccountants: (companyId) => api.get(`/projects/accountants/${companyId}`),
  getStoreIncharge: (companyId) => api.get(`/projects/store-incharge/${companyId}`),
  getSentRequirements: (userId) => api.get(`/projects/requirements/sent/${userId}`),
  getReceivedRequirements: (userId) => api.get(`/projects/requirements/received/${userId}`),
  getRequirement: (requirementId) => api.get(`/projects/requirements/${requirementId}`),
  createRequirement: (data) => api.post('/projects/requirements', data),
  updateRequirementStatus: (requirementId, status) => api.put(`/projects/requirements/${requirementId}/status`, { status }),
  // Material Usage API
  sendMaterialUsageToAccounts: (data) => api.post('/projects/material-usage', data),
  getMaterialUsageReports: (accountantId) => api.get(`/projects/material-usage/accountant/${accountantId}`),
  // Stock Check API
  checkStock: (companyId, materials) => api.post('/projects/check-stock', { company_id: companyId, materials }),
  // Vendor Portal API
  createVendorDemand: (data) => api.post('/projects/vendor-demands', data),
  getAccountantDemands: (userId) => api.get(`/projects/vendor-demands/accountant/${userId}`),
  getVendorDemand: (demandId) => api.get(`/projects/vendor-demands/${demandId}`),
  getOpenDemands: () => api.get('/projects/vendor-demands/open/all'),
  getDemandItems: (demandId) => api.get(`/projects/vendor-demands/${demandId}/items`),
  getMinimumBids: (demandId) => api.get(`/projects/vendor-demands/${demandId}/minimum-bids`),
  submitBid: (demandId, data) => api.post(`/projects/vendor-demands/${demandId}/bids`, data),
  getVendorBids: (vendorId) => api.get(`/projects/vendor-bids/${vendorId}`),
  updateBidStatus: (bidId, status, created_by, company_id) => api.put(`/projects/vendor-bids/${bidId}/status`, { status, created_by, company_id }),
  awardBidItems: (bidId, data) => api.post(`/projects/vendor-bids/${bidId}/award-items`, data),
  getMaterialsDetail: (companyId) => api.get(`/projects/materials-detail/${companyId}`),
  // Orders API
  searchMaterialsByItemOrHSN: (companyId, searchTerm) => api.get(`/projects/materials-detail/${companyId}/search?term=${searchTerm}`),
  createMajorOrder: (data) => api.post('/projects/major-orders', data),
  createMinorOrder: (data) => api.post('/projects/minor-orders', data),
  getMajorOrders: (companyId) => api.get(`/projects/major-orders/company/${companyId}`),
  getMinorOrders: (companyId) => api.get(`/projects/minor-orders/company/${companyId}`),
  getMinorOrderBids: (minorOrderId) => api.get(`/projects/minor-orders/${minorOrderId}/bids`),
  getMinorOrderMinimumBids: (minorOrderId) => api.get(`/projects/minor-orders/${minorOrderId}/minimum-bids`),
  selectMinorOrderVendor: (minorOrderId, bidId) => api.put(`/projects/minor-orders/${minorOrderId}/select-vendor`, { bid_id: bidId }),
  submitMinorOrderBid: (orderId, data) => api.post(`/projects/minor-orders/${orderId}/bids`, data),
  // Vendor Orders API
  getVendorMajorOrders: (vendorId) => api.get(`/projects/major-orders/vendor/${vendorId}`),
  updateOrderStatus: (orderId, status) => api.put(`/projects/major-orders/${orderId}/status`, { status }),
  getOpenMinorOrders: () => api.get('/projects/minor-orders/open/all'),
  getMinorOrder: (orderId) => api.get(`/projects/minor-orders/${orderId}`),
  getMinorOrders: (companyId) => api.get(`/projects/minor-orders/company/${companyId}`),
  // Order Receipts API
  submitOrderReceipt: (formData) => {
    const API_BASE_URL = getApiUrl();
    return axios.post(`${API_BASE_URL}/projects/order-receipts`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getOrderReceipts: (companyId) => api.get(`/projects/order-receipts/company/${companyId}`),
  getOrderReceipt: (receiptId) => api.get(`/projects/order-receipts/${receiptId}`),
  updateReceiptStatus: (receiptId, status, approved_by) => api.put(`/projects/order-receipts/${receiptId}/status`, { status, approved_by }),
  updateReceiptAmounts: (receiptId, data) => api.put(`/projects/order-receipts/${receiptId}/amounts`, data),

  // Inventory API
  getInventory: (companyId) => api.get(`/projects/inventory/company/${companyId}`),

  // Barcodes API
  getBarcode: (orderId) => api.get(`/projects/barcodes/order/${orderId}`),
  getBarcodeByQrNumber: (qrNumber) => api.get(`/projects/barcodes/qr/${qrNumber}`),
  getBarcodesByItem: (itemName, companyId) => api.get(`/projects/barcodes/item/${encodeURIComponent(itemName)}/company/${companyId}`),
  saveBarcode: (barcodeData) => api.post(`/projects/barcodes`, barcodeData),
  updateBarcode: (barcodeId, barcodeData) => api.put(`/projects/barcodes/${barcodeId}`, barcodeData),

  // Store Requests API
  createStoreRequest: (data) => api.post('/projects/store-requests', data),
  getStoreRequests: (companyId) => api.get(`/projects/store-requests/company/${companyId}`),
  getProjectStoreRequests: (projectId) => api.get(`/projects/store-requests/project/${projectId}`),
  getStoreRequest: (requestId) => api.get(`/projects/store-requests/${requestId}`),
  updateStoreRequestStatus: (requestId, data) => api.put(`/projects/store-requests/${requestId}/status`, data),
  getWorkers: (companyId) => api.get(`/projects/workers/company/${companyId}`),
  allocateStockToWorker: (requestId, data) => api.put(`/projects/store-requests/${requestId}/allocate`, data),
  getWorkerProjects: (workerId) => api.get(`/projects/worker/${workerId}`),
  getWorkerTasks: (workerId) => api.get(`/projects/allocation-tasks/worker/${workerId}`),
  getCompanyAllocationTasks: (companyId) => api.get(`/projects/allocation-tasks/company/${companyId}`),
  getAllocationTaskByQR: (qrNumber) => api.get(`/projects/allocation-tasks/qr/${qrNumber}`),
  confirmAllocation: (taskId, data) => api.put(`/projects/allocation-tasks/${taskId}/confirm`, data),
  getProjectWorkers: (projectId) => api.get(`/projects/${projectId}/workers`),
  addProjectWorker: (projectId, workerId) => api.post(`/projects/${projectId}/workers`, { workerId }),
  removeProjectWorker: (projectId, workerId) => api.delete(`/projects/${projectId}/workers/${workerId}`),
  getNotifications: (userId) => api.get(`/notifications/user/${userId}`),
  getCompanyUsers: (companyId) => api.get(`/users/company/${companyId}`),
  submitJobWork: (formData) => api.post('/projects/job-work/submit', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getJobWorkRequests: (companyId) => api.get(`/projects/job-work/company/${companyId}`),
  getStoreInchargeJobWork: (storeInchargeId) => api.get(`/projects/job-work/store-incharge/${storeInchargeId}`),
  getAccountantJobWork: (accountantId) => api.get(`/projects/job-work/accountant/${accountantId}`),
  uploadJobWorkChallan: (id, formData) => api.put(`/projects/job-work/${id}/challan`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
};


// Notifications API
export const notificationsAPI = {
  getAll: (userId) => api.get(`/notifications?user_id=${userId}`),
  markAsRead: (notificationId) => api.put(`/notifications/${notificationId}/read`),
  markAllAsRead: (userId) => api.put(`/notifications/read-all`, { user_id: userId }),
  getUnreadCount: (userId) => api.get(`/notifications?user_id=${userId}`),
};

// Add usersAPI for employee management
export const usersAPI = {
  getPending: (companyId) => api.get(`/users/pending/${companyId}`),
  getCompanyEmployees: (companyId) => api.get(`/users/company/${companyId}`),
  approveUser: (userId) => api.put(`/users/${userId}/approve`),
  deleteUser: (userId) => api.delete(`/users/${userId}`),
};

// Enquiries API
export const enquiriesAPI = {
  upload: (formData) => api.post('/enquiries/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getByCompany: (companyId) => api.get(`/enquiries/company/${companyId}`),
  getById: (id) => api.get(`/enquiries/${id}`),
  download: (id) => api.get(`/enquiries/${id}/download`, { responseType: 'blob' }),
  update: (id, data) => api.put(`/enquiries/${id}`, data),
  delete: (id) => api.delete(`/enquiries/${id}`),
  sendToNPD: (id, npdUserId) => api.post(`/enquiries/${id}/send-to-npd`, { npd_user_id: npdUserId }),
  getAssigned: (userId) => api.get(`/enquiries/assigned/${userId}`),
  markViewed: (id) => api.put(`/enquiries/${id}/mark-viewed`),
  uploadQuotation: (id, formData) => api.post(`/enquiries/${id}/upload-quotation`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  reviewQuotation: (id, status, remarks) => api.put(`/enquiries/${id}/review`, { status, remarks }),
  uploadPO: (id, formData) => api.post(`/enquiries/${id}/upload-po`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  customerReview: (id, status, remarks) => api.put(`/enquiries/${id}/customer-review`, { status, remarks }),
};

export const masterMaterialsAPI = {
  getAll: (businessName) => api.get(`/master-materials${businessName ? `?business_name=${encodeURIComponent(businessName)}` : ''}`),
  create: (data) => api.post('/master-materials', data),
  update: (id, data) => api.put(`/master-materials/${id}`, data),
  delete: (id) => api.delete(`/master-materials/${id}`),
};

export const masterVendorsAPI = {
  getAll: () => api.get('/master-vendors'),
  create: (data) => api.post('/master-vendors', data),
  update: (id, data) => api.put(`/master-vendors/${id}`, data),
  delete: (id) => api.delete(`/master-vendors/${id}`),
};

export const purchaseOrdersAPI = {
  create: (data) => api.post('/purchase-orders', data),
  getByCompany: (companyId) => api.get(`/purchase-orders/company/${companyId}`),
  getById: (id) => api.get(`/purchase-orders/${id}`),
  updateStatus: (id, status) => api.put(`/purchase-orders/${id}/status`, { status }),
};

export const attendanceAPI = {
  getByCompany: (companyId, date) => 
    api.get(`/projects/attendance/company/${companyId}${date ? `?date=${date}` : ''}`),
};

export default api;
