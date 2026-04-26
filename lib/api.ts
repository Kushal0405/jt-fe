import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Inject JWT on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ---- typed API calls ----

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),
  me: () => api.get('/auth/me'),
};

export const jobsApi = {
  list: (params?: Record<string, string | number>) =>
    api.get('/jobs', { params }),
  get: (id: string) => api.get(`/jobs/${id}`),
  create: (data: Record<string, unknown>) => api.post('/jobs', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/jobs/${id}`, data),
  delete: (id: string) => api.delete(`/jobs/${id}`),
};

export const applicationsApi = {
  list: (params?: Record<string, string | number>) =>
    api.get('/applications', { params }),
  get: (id: string) => api.get(`/applications/${id}`),
  create: (data: Record<string, unknown>) => api.post('/applications', data),
  updateStage: (id: string, stage: string, note?: string) =>
    api.patch(`/applications/${id}/stage`, { stage, note }),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/applications/${id}`, data),
  delete: (id: string) => api.delete(`/applications/${id}`),
};

export const companiesApi = {
  list: (params?: Record<string, string>) => api.get('/companies', { params }),
  get: (id: string) => api.get(`/companies/${id}`),
  create: (data: Record<string, unknown>) => api.post('/companies', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/companies/${id}`, data),
  toggleTarget: (id: string) => api.patch(`/companies/${id}/target`),
};

export const resumeApi = {
  list: () => api.get('/resume'),
  upload: (formData: FormData) =>
    api.post('/resume/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  match: (resumeId: string, jobId: string) =>
    api.post(`/resume/${resumeId}/match/${jobId}`),
  setDefault: (id: string) => api.patch(`/resume/${id}/set-default`),
  delete: (id: string) => api.delete(`/resume/${id}`),
};