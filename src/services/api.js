let isOffline = false;
const statusListeners = new Set();

export const apiStatus = {
  isBackendOffline: () => isOffline,
  subscribe: (listener) => {
    statusListeners.add(listener);
    return () => statusListeners.delete(listener);
  },
  setOffline: (status) => {
    if (isOffline !== status) {
      isOffline = status;
      statusListeners.forEach(l => l(isOffline));
    }
  }
};

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://sansah-backend.onrender.com/api';
  }
  return 'http://localhost:5000/api';
};

const BASE_URL = getBaseUrl();

/**
 * Standardized fetch API helper that handles errors and parsing uniformly.
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  // Attach JWT token dynamically
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  try {
    const res = await fetch(url, config);
    
    // Request succeeded, backend is online
    apiStatus.setOffline(false);

    // If 401 Unauthorized, automatically log out (except during login)
    if (res.status === 401 && endpoint !== '/users/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    // Attempt parsing JSON
    let data = null;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = { success: res.ok, message: await res.text() };
    }

    if (!res.ok) {
      throw new Error(data.message || `HTTP error! status: ${res.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Fetch Error [${url}]:`, error);
    
    // Intercept network/connectivity failure errors
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      apiStatus.setOffline(true);
      const customErr = new Error('Cannot connect to the backend server. Please verify that the backend is running at ' + BASE_URL);
      customErr.originalError = error;
      customErr.isNetworkError = true;
      throw customErr;
    }
    
    throw error;
  }
}

export const api = {
  // Dashboard Stats
  fetchDashboardStats: () => apiFetch('/dashboard/stats'),

  // Devices
  fetchDevices: () => apiFetch('/devices'),
  fetchDeviceById: (id) => apiFetch(`/devices/${id}`),
  registerDevice: (payload) => apiFetch('/devices', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  updateDevice: (id, payload) => apiFetch(`/devices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),
  deleteDevice: (id) => apiFetch(`/devices/${id}`, {
    method: 'DELETE'
  }),

  // Sensors
  fetchSensors: (deviceId) => apiFetch(`/sensors?deviceId=${deviceId}`),
  logSensorReading: (payload) => apiFetch('/sensors', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  // Alerts
  fetchAlerts: ({ status, severity, device_id, page = 1, limit = 10 } = {}) => {
    let query = `/alerts?page=${page}&limit=${limit}`;
    if (status && status !== 'All') query += `&status=${status}`;
    if (severity && severity !== 'All') query += `&severity=${severity}`;
    if (device_id) query += `&device_id=${device_id}`;
    return apiFetch(query);
  },
  fetchAlertStats: () => apiFetch('/alerts/stats'),
  acknowledgeAlert: (id) => apiFetch(`/alerts/${id}/acknowledge`, {
    method: 'PUT'
  }),
  resolveAlert: (id) => apiFetch(`/alerts/${id}/resolve`, {
    method: 'PUT'
  }),
  
  // Users / Auth
  loginUser: (email, password) => apiFetch('/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  logoutUser: () => apiFetch('/users/logout', {
    method: 'POST'
  }),
  
  // Audit Logs
  fetchAuditLogs: ({ page = 1, limit = 10, search = '', action = '' } = {}) => {
    let query = `/audit-logs?page=${page}&limit=${limit}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    if (action) query += `&action=${encodeURIComponent(action)}`;
    return apiFetch(query);
  },

  triggerTestSpike: (deviceId) => apiFetch(`/devices/${deviceId}/test-spike`, {
    method: 'POST'
  }),
  fetchSettings: () => apiFetch('/settings'),
  updateAdminSettings: (payload) => apiFetch('/settings/admin', {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),
  updateEmailSettings: (payload) => apiFetch('/settings/email', {
    method: 'PUT',
    body: JSON.stringify(payload)
  }),
  sendSettingsTestEmail: (payload) => apiFetch('/settings/test-email', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  fetchSystemStatus: () => apiFetch('/settings/system-status')
};
