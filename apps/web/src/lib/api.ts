import axios from 'axios';

export const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to attach bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('orbit_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        const storedRefreshToken = localStorage.getItem('orbit_refresh_token');
        const res = await axios.post(
          '/api/v1/auth/refresh',
          { refreshToken: storedRefreshToken },
          { withCredentials: true },
        );
        const { accessToken, refreshToken } = res.data;
        localStorage.setItem('orbit_access_token', accessToken);
        if (refreshToken) {
          localStorage.setItem('orbit_refresh_token', refreshToken);
        }
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('orbit_access_token');
        localStorage.removeItem('orbit_refresh_token');
        localStorage.removeItem('orbit_user');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);
