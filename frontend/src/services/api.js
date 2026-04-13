import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// Properties
export const propertyAPI = {
  getAll: (params) => api.get('/properties', { params }),
  getOne: (id) => api.get(`/properties/${id}`),
  create: (data) => api.post('/properties', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/properties/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/properties/${id}`),
  getMyProperties: () => api.get('/properties/my-properties'),
  toggleWishlist: (id) => api.post(`/properties/${id}/wishlist`),
};

// Bookings
export const bookingAPI = {
  create: (data) => api.post('/bookings', data),
  getAll: (params) => api.get('/bookings', { params }),
  getOne: (id) => api.get(`/bookings/${id}`),
  updateStatus: (id, data) => api.put(`/bookings/${id}/status`, data),
  getAvailability: (propertyId) => api.get(`/bookings/availability/${propertyId}`),
};

// Payments
export const paymentAPI = {
  createIntent: (data) => api.post('/payments/create-intent', data),
  confirm: (data) => api.post('/payments/confirm', data),
  getHistory: (params) => api.get('/payments/history', { params }),
};

// Maintenance
export const maintenanceAPI = {
  create: (data) => api.post('/maintenance', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAll: (params) => api.get('/maintenance', { params }),
  update: (id, data) => api.put(`/maintenance/${id}`, data),
};

// Reviews
export const reviewAPI = {
  create: (data) => api.post('/reviews', data),
  getByProperty: (propertyId) => api.get(`/reviews/property/${propertyId}`),
};

// Notifications
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// Admin
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params) => api.get('/admin/users', { params }),
  toggleUser: (id) => api.put(`/admin/users/${id}/toggle`),
  getProperties: (params) => api.get('/admin/properties', { params }),
};
