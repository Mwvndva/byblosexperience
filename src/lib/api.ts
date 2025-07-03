import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3002/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // Important for cookies
});

// Helper function to get token from localStorage
const getToken = () => {
  return localStorage.getItem('organizerToken');
};

// Add a request interceptor to include the token in requests
api.interceptors.request.use(
  (config) => {
    // Skip adding token for auth endpoints
    const authEndpoints = ['/organizers/login', '/organizers/register', '/organizers/refresh-token', '/organizers/forgot-password', '/organizers/reset-password/'];
    const isAuthEndpoint = authEndpoints.some(endpoint => config.url?.includes(endpoint));
    
    if (!isAuthEndpoint) {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token refresh and errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If error is not 401 or we've already tried to refresh, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }
    
    // Mark request as retried to prevent infinite loops
    originalRequest._retry = true;
    
    try {
      // Try to refresh the token
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3002/api'}/organizers/refresh-token`,
        {},
        { withCredentials: true }
      );
      
      const { token } = response.data.data;
      
      // Store the new token
      localStorage.setItem('organizerToken', token);
      
      // Update the Authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      originalRequest.headers['Authorization'] = `Bearer ${token}`;
      
      // Retry the original request
      return api(originalRequest);
    } catch (refreshError) {
      // If refresh fails, log out the user
      localStorage.removeItem('organizerToken');
      delete api.defaults.headers.common['Authorization'];
      
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/organizer/login';
      }
      
      return Promise.reject(refreshError);
    }
  }
);

// Helper function to handle API errors consistently
const handleApiError = (error) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const { status, data } = error.response;
    const message = data?.message || 'An error occurred';
    
    // Show error toast for client-side errors (4xx) and server errors (5xx)
    if (status >= 400) {
      toast.error(message);
    }
    
    return Promise.reject({ message, status, data });
  } else if (error.request) {
    // The request was made but no response was received
    toast.error('No response from server. Please check your connection.');
    return Promise.reject({ message: 'No response from server' });
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error('Request setup error:', error.message);
    toast.error('Failed to process request');
    return Promise.reject({ message: error.message });
  }
};

// Export a function to set the auth token
export const setAuthToken = (token: string | null) => {
  if (token) {
    localStorage.setItem('organizerToken', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    localStorage.removeItem('organizerToken');
    delete api.defaults.headers.common['Authorization'];
  }
};

// Export a function to check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('organizerToken');
};

// Export a function to log out
export const logout = () => {
  localStorage.removeItem('organizerToken');
  delete api.defaults.headers.common['Authorization'];
  // Redirect to login page
  window.location.href = '/organizer/login';
};

// Export a function to get the current user
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/organizers/me');
    return response.data.data.organizer;
  } catch (error) {
    // If not authenticated, clear the token
    if (error.response?.status === 401) {
      setAuthToken(null);
    }
    throw error;
  }
};

export default api;
