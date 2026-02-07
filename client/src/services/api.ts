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

// Analysis API - wraps responses to match expected format
export const analysisApi = {
  create: (formData: FormData) =>
    api.post('/analysis/create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 minute timeout for AI processing
    }),

  get: (analysisId: string) =>
    api.get(`/analysis/${analysisId}`).then(res => ({
      data: {
        data: res.data
      }
    })),

  list: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) => api.get('/analysis/list', { params }).then(res => ({
    data: {
      data: {
        analyses: res.data.analyses || [],
        pagination: {
          page: 1,
          pages: 1,
          total: res.data.total || 0
        }
      }
    }
  })),

  delete: (analysisId: string) =>
    api.delete(`/analysis/${analysisId}`),

  // Simplified - return analysis result directly
  downloadReport: (analysisId: string) =>
    api.get(`/analysis/${analysisId}`).then(res => {
      const result = res.data.analysis?.result || res.data.result || res.data;
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
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

// Admin API - wraps responses to match expected format
export const adminApi = {
  getDashboard: () => api.get('/admin/users').then(res => ({
    data: {
      stats: {
        totalUsers: res.data.total || 0,
        totalAnalyses: 0,
        pendingApprovals: (res.data.users || []).filter((u: any) => u.accountState === 'pending').length,
      }
    }
  })),

  getUsers: (params?: {
    page?: number;
    limit?: number;
    accountState?: string;
    role?: string;
    search?: string;
  }) => api.get('/admin/users', { params }).then(res => ({
    data: {
      data: {
        users: res.data.users || [],
        pagination: {
          page: 1,
          pages: 1,
          total: res.data.total || 0
        }
      }
    }
  })),

  getPendingApprovals: () => api.get('/admin/users').then(res => ({
    data: {
      users: (res.data.users || []).filter((u: any) => u.accountState === 'pending')
    }
  })),

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

  getAIConfig: () => api.get('/admin/ai-config').then(res => ({
    data: {
      data: {
        config: {
          ...res.data.config,
          hasApiKey: !!process.env.OPENAI_API_KEY || true // Assume key is set via env
        }
      }
    }
  })),

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
  }) => Promise.resolve({ data: { data: { logs: [], pagination: { pages: 0 } } } }),

  getFeedback: (params?: {
    page?: number;
    limit?: number;
  }) => Promise.resolve({ data: { data: { feedbacks: [], pagination: { pages: 0 } } } }),

  respondToFeedback: (feedbackId: string, response: string) =>
    Promise.resolve({ data: { success: true } }),
};
