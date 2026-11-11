import axios from 'axios';

const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Ubah error Axios menjadi pesan yang ramah pengguna.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;
    let message = 'Terjadi kesalahan. Coba lagi.';

    if (!error.response) {
      message = 'Tidak dapat terhubung ke server. Pastikan backend berjalan dan VITE_API_URL benar.';
    } else if (data?.errors?.length) {
      message = data.errors.map((e) => e.message).join(' ');
    } else if (data?.message) {
      message = data.message;
    }

    error.userMessage = message;
    error.fieldErrors = (data?.errors || []).reduce((acc, e) => {
      if (e.field) acc[e.field] = e.message;
      return acc;
    }, {});
    return Promise.reject(error);
  }
);

export const getErrorMessage = (error) => error?.userMessage || error?.message || 'Terjadi kesalahan.';

// ---------- Proyek ----------
export const fetchProjects = (params) => api.get('/projects', { params }).then((r) => r.data.data);
export const fetchStats = () => api.get('/projects/stats').then((r) => r.data.data);
export const createProject = (payload) => api.post('/projects', payload).then((r) => r.data);
export const updateProject = (id, payload) => api.put(`/projects/${id}`, payload).then((r) => r.data);
export const deleteProject = (id) => api.delete(`/projects/${id}`).then((r) => r.data);

// ---------- WhatsApp ----------
export const sendReminder = (id) => api.post(`/projects/${id}/remind`).then((r) => r.data);
export const fetchProjectLogs = (id) => api.get(`/projects/${id}/logs`).then((r) => r.data.data);
export const fetchWaStatus = () => api.get('/whatsapp/status').then((r) => r.data.data);
export const fetchWaQr = () => api.get('/whatsapp/qr').then((r) => r.data.data.qr);
export const logoutWa = () => api.post('/whatsapp/logout').then((r) => r.data);
export const reconnectWa = () => api.post('/whatsapp/reconnect').then((r) => r.data);

export default api;
