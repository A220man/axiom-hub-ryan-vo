/* API Client */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { TokenResponse, OIDCConfig, User, DesignAnalysis, DesignDocument, DesignCritique, PaginationParams, PaginatedResponse, ApiError } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Token management
let accessToken: string | null = null;
let refreshToken: string | null = null;

export const setTokens = (tokens: TokenResponse) => {
  accessToken = tokens.access_token;
  refreshToken = tokens.refresh_token;
  localStorage.setItem('access_token', tokens.access_token);
  localStorage.setItem('refresh_token', tokens.refresh_token);
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

export const getAccessToken = () => accessToken || localStorage.getItem('access_token');
export const getRefreshToken = () => refreshToken || localStorage.getItem('refresh_token');

// Initialize from localStorage
if (typeof window !== 'undefined') {
  accessToken = localStorage.getItem('access_token');
  refreshToken = localStorage.getItem('refresh_token');
}

// Request interceptor to add auth header
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry && getRefreshToken()) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post<TokenResponse>(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: getRefreshToken(),
        });
        setTokens(response.data);
        processQueue(null, response.data.access_token);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// API functions
export const authApi = {
  getConfig: () => api.get<OIDCConfig>('/auth/config'),
  getMe: () => api.get<User>('/auth/me'),
  refresh: (refresh_token: string) => api.post<TokenResponse>('/auth/refresh', { refresh_token }),
  logout: () => api.post('/auth/logout'),
};

export const analyzeApi = {
  analyzeDesignSystem: (data: { name: string; source_path: string; include_llm_explanation?: boolean }) =>
    api.post<DesignAnalysis>('/analyze/design-system', data),
  listAnalyses: (params?: PaginationParams) =>
    api.get<PaginatedResponse<DesignAnalysis>>('/analyze/design-system', { params }),
  getAnalysis: (id: number) => api.get<DesignAnalysis>(`/analyze/design-system/${id}`),
  deleteAnalysis: (id: number) => api.delete(`/analyze/design-system/${id}`),
};

export const generateApi = {
  generateDesignDoc: (data: { name: string; analysis_id?: number; custom_content?: Record<string, unknown>; include_llm_explanation?: boolean }) =>
    api.post<DesignDocument>('/generate/design-doc', data),
  listDocuments: (params?: PaginationParams) =>
    api.get<PaginatedResponse<DesignDocument>>('/generate/design-doc', { params }),
  getDocument: (id: number) => api.get<DesignDocument>(`/generate/design-doc/${id}`),
  downloadDocument: (id: number) => api.get(`/generate/design-doc/${id}/download`, { responseType: 'blob' }),
  deleteDocument: (id: number) => api.delete(`/generate/design-doc/${id}`),
};

export const critiqueApi = {
  critiqueDesign: (data: { name: string; analysis_id?: number; document_id?: number; include_llm_explanation?: boolean }) =>
    api.post<DesignCritique>('/critique/design', data),
  listCritiques: (params?: PaginationParams) =>
    api.get<PaginatedResponse<DesignCritique>>('/critique/design', { params }),
  getCritique: (id: number) => api.get<DesignCritique>(`/critique/design/${id}`),
  deleteCritique: (id: number) => api.delete(`/critique/design/${id}`),
};

export default api;