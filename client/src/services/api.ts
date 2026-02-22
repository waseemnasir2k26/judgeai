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

  verifyEmail: (email: string, code: string) =>
    api.post('/auth/verify-email', { email, code }),

  resendVerification: (email: string) =>
    api.post('/auth/resend-verification', { email }),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  logout: (refreshToken?: string) => {
    const token = refreshToken || localStorage.getItem('refreshToken');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    // Fire and forget - don't block on server response
    if (token) {
      api.post('/auth/logout', { refreshToken: token }).catch(() => { });
    }
    return Promise.resolve({ data: { success: true } });
  },

  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  getCurrentUser: () => api.get('/auth/me'),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    api.post('/auth/reset-password', { email, code, newPassword }),
};

// Analysis API - wraps responses to match expected format
export const analysisApi = {
  create: (formData: FormData) => {
    // For FormData, we must NOT set Content-Type - browser sets it with boundary
    // We need to delete the default JSON content type
    return axios.post(`${API_URL}/analysis/create`, formData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        // No Content-Type here - let browser set multipart/form-data with boundary
      },
      timeout: 65000, // 65 second timeout (Vercel Hobby plan max is 60s)
    });
  },

  get: (analysisId: string) =>
    api.get(`/analysis/${analysisId}`).then(res => ({
      data: {
        data: {
          analysis: res.data.analysis || res.data
        }
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
    Promise.resolve({ data: { data: { feedback: null } } }),

  getUserFeedback: (params?: { page?: number; limit?: number }) =>
    Promise.resolve({ data: { feedbacks: [], total: 0 } }),
};

// Admin API - wraps responses to match expected format
export const adminApi = {
  getDashboard: () => api.get('/admin/users').then(res => ({
    data: {
      data: {
        stats: {
          totalUsers: res.data.total || 0,
          totalAnalyses: 0,
          pendingApprovals: (res.data.users || []).filter((u: any) => u.accountState === 'pending').length,
          approvedUsers: (res.data.users || []).filter((u: any) => u.accountState === 'approved').length,
          completedAnalyses: 0,
          averageRating: 0,
        },
        recentUsers: res.data.users || [],
        recentAnalyses: [],
      }
    }
  })),

  getUsers: (params?: {
    page?: number;
    limit?: number;
    accountState?: string;
    role?: string;
    search?: string;
    sortOrder?: string;
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
          // hasApiKey and apiKeySource come from the backend now
          hasApiKey: res.data.config?.hasApiKey ?? false,
          apiKeySource: res.data.config?.apiKeySource ?? null
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
    openaiApiKey?: string;
  }) => api.put('/admin/ai-config', data),

  testAIConfig: (data?: { apiKey?: string; model?: string }) =>
    api.post('/admin/ai-config', data || {}),

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
  }) => Promise.resolve({ data: { data: { feedback: [], pagination: { pages: 0 } } } }),

  getFeedbackStats: () => Promise.resolve({
    data: {
      data: {
        stats: {
          totalFeedback: 0,
          averageRating: 0,
          averageNps: 0,
          categoryAverages: {
            accuracy: 0,
            speed: 0,
            usability: 0,
            quality: 0,
          },
          recommendationRate: 0,
        }
      }
    }
  }),

  respondToFeedback: (feedbackId: string, response: string) =>
    Promise.resolve({ data: { success: true } }),
};
