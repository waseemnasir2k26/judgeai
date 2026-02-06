import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh-token`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }

          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authApi = {
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => api.post('/auth/register', data),

  verifyEmail: (email: string, code: string) =>
    api.post('/auth/verify-email', { email, code }),

  resendVerification: (email: string) =>
    api.post('/auth/resend-verification', { email }),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),

  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh-token', { refreshToken }),

  getCurrentUser: () => api.get('/auth/me'),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    api.post('/auth/reset-password', { email, code, newPassword }),
};

// Analysis API
export const analysisApi = {
  create: (formData: FormData) =>
    api.post('/analysis', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  start: (analysisId: string) =>
    api.post(`/analysis/${analysisId}/start`),

  get: (analysisId: string) =>
    api.get(`/analysis/${analysisId}`),

  getProgress: (analysisId: string) =>
    api.get(`/analysis/${analysisId}/progress`),

  list: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => api.get('/analysis', { params }),

  delete: (analysisId: string) =>
    api.delete(`/analysis/${analysisId}`),

  downloadReport: (analysisId: string) =>
    api.get(`/analysis/${analysisId}/report`, { responseType: 'blob' }),

  exportJson: (analysisId: string) =>
    api.get(`/analysis/${analysisId}/export`),
};

// Feedback API
export const feedbackApi = {
  submit: (analysisId: string, data: {
    rating: number;
    npsScore: number;
    categories: {
      accuracy: number;
      usefulness: number;
      clarity: number;
      speed: number;
    };
    comments?: string;
    improvements?: string;
    wouldRecommend: boolean;
  }) => api.post(`/feedback/analysis/${analysisId}`, data),

  get: (analysisId: string) =>
    api.get(`/feedback/analysis/${analysisId}`),

  getUserFeedback: (params?: { page?: number; limit?: number }) =>
    api.get('/feedback/my-feedback', { params }),
};

// Admin API
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),

  getUsers: (params?: {
    page?: number;
    limit?: number;
    accountState?: string;
    role?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => api.get('/admin/users', { params }),

  getPendingApprovals: () => api.get('/admin/users/pending'),

  approveUser: (userId: string) =>
    api.post(`/admin/users/${userId}/approve`),

  rejectUser: (userId: string, reason?: string) =>
    api.post(`/admin/users/${userId}/reject`, { reason }),

  suspendUser: (userId: string, reason?: string) =>
    api.post(`/admin/users/${userId}/suspend`, { reason }),

  reactivateUser: (userId: string) =>
    api.post(`/admin/users/${userId}/reactivate`),

  deleteUser: (userId: string) =>
    api.delete(`/admin/users/${userId}`),

  getAIConfig: () => api.get('/admin/ai-config'),

  updateAIConfig: (data: {
    openaiApiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    masterSystemPrompt?: string;
    tonePrompts?: {
      aggressive?: string;
      professional?: string;
      simple?: string;
    };
  }) => api.put('/admin/ai-config', data),

  testAIConfig: (data?: { apiKey?: string; model?: string }) =>
    api.post('/admin/ai-config/test', data),

  getAuditLogs: (params?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/admin/audit-logs', { params }),

  getFeedback: (params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) => api.get('/admin/feedback', { params }),

  respondToFeedback: (feedbackId: string, response: string) =>
    api.post(`/admin/feedback/${feedbackId}/respond`, { response }),
};
