import axios from 'axios';

// Update this with your computer's IP address for phone testing
// Find your IP: Run 'ipconfig' in command prompt and look for IPv4 Address
const API_BASE_URL = 'http://10.69.76.87:3000/api'; // Your computer's IP

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const authAPI = {
  login: (email, password, role) => 
    api.post('/auth/login', { email, password, role }),
  
  signup: (name, email, password, role, company_id, company_name, gst_number) => 
    api.post('/auth/signup', { name, email, password, role, company_id, company_name, gst_number }),
};

export const companiesAPI = {
  getAll: () => api.get('/companies'),
  getById: (id) => api.get(`/companies/${id}`),
  create: (data) => api.post('/companies', data),
};

export default api;
