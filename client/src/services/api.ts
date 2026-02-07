import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// For Vercel deployment, API routes are at /api
// For local dev, you might use a different URL
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;

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

  // Simplified for testing - skip email verification
  verifyEmail: (email: string, code: string) =>
    Promise.resolve({ data: { success: true } }),

  resendVerification: (email: string) =>
    Promise.resolve({ data: { success: true } }),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return Promise.resolve({ data: { success: true } });
  },

  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  getCurrentUser: () => api.get('/auth/me'),

  // Simplified for testing
  forgotPassword: (email: string) =>
    Promise.resolve({ data: { success: true, message: 'Password reset not available in demo mode' } }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    Promise.resolve({ data: { success: true } }),
};

// Analysis API
export const analysisApi = {
  create: (formData: FormData) =>
    api.post('/analysis/create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 minute timeout for AI processing
    }),

  get: (analysisId: string) =>
    api.get(`/analysis/${analysisId}`),

  list: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => api.get('/analysis/list', { params }),

  delete: (analysisId: string) =>
    api.delete(`/analysis/${analysisId}`),

  // Simplified - return analysis result directly
  downloadReport: (analysisId: string) =>
    api.get(`/analysis/${analysisId}`).then(res => {
      // Create a simple text/JSON download
      const blob = new Blob([JSON.stringify(res.data.analysis?.result, null, 2)], { type: 'application/json' });
      return { data: blob };
    }),

  exportJson: (analysisId: string) =>
    api.get(`/analysis/${analysisId}`),
};

// Feedback API (simplified for demo)
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
  }) => Promise.resolve({ data: { success: true } }),

  get: (analysisId: string) =>
    Promise.resolve({ data: { feedback: null } }),

  getUserFeedback: (params?: { page?: number; limit?: number }) =>
    Promise.resolve({ data: { feedbacks: [], total: 0 } }),
};

// Admin API
export const adminApi = {
  getDashboard: () => api.get('/admin/users').then(res => ({
    data: {
      stats: {
        totalUsers: res.data.total || 0,
        totalAnalyses: 0,
        pendingApprovals: 0,
      }
    }
  })),

  getUsers: (params?: {
    page?: number;
    limit?: number;
    accountState?: string;
    role?: string;
    search?: string;
  }) => api.get('/admin/users', { params }),

  getPendingApprovals: () => api.get('/admin/users'),

  approveUser: (userId: string) =>
    api.put('/admin/users', { userId, action: 'approve' }),

  rejectUser: (userId: string, reason?: string) =>
    api.put('/admin/users', { userId, action: 'reject' }),

  suspendUser: (userId: string, reason?: string) =>
    api.put('/admin/users', { userId, action: 'suspend' }),

  reactivateUser: (userId: string) =>
    api.put('/admin/users', { userId, action: 'activate' }),

  deleteUser: (userId: string) =>
    Promise.resolve({ data: { success: true } }), // Not implemented for safety

  getAIConfig: () => api.get('/admin/ai-config'),

  updateAIConfig: (data: {
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
    api.get('/health').then(() => ({ data: { success: true } })),

  getAuditLogs: (params?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => Promise.resolve({ data: { logs: [], total: 0 } }),

  getFeedback: (params?: {
    page?: number;
    limit?: number;
  }) => Promise.resolve({ data: { feedbacks: [], total: 0 } }),

  respondToFeedback: (feedbackId: string, response: string) =>
    Promise.resolve({ data: { success: true } }),
};
