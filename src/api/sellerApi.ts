import axios from 'axios';

// Ensure VITE_API_URL ends with /api but doesn't have a trailing slash
const getApiBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  // Remove trailing slash if exists
  const cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  // Add /api if not already in the URL
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

const API_URL = getApiBaseUrl();

// Interfaces
export interface Seller {
  id: number;
  fullName: string;
  full_name?: string;
  email: string;
  phone: string;
  createdAt: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image_url: string;
  aesthetic: string;
  sellerId: string;
  isSold: boolean;
  status: 'available' | 'sold';
  soldAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  productId: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: OrderItem[];
  total: number;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  createdAt: string;
  updatedAt?: string;
}

interface SellerAnalytics {
  totalProducts: number;
  publishedProducts: number;
  totalRevenue: number;
  monthlySales: Array<{ month: string; sales: number }>;
}

// Create axios instance for seller API
const sellerApiInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
sellerApiInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sellerToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
sellerApiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sellerToken');
      if (!window.location.pathname.includes('login')) {
        window.location.href = '/seller/login';
      }
    }
    return Promise.reject(error);
  }
);

// Helper function to transform product data
const transformProduct = (product: any): Product => ({
  ...product,
  image_url: product.image_url || product.imageUrl,
  sellerId: product.sellerId || product.seller_id,
  createdAt: product.createdAt || product.created_at,
  updatedAt: product.updatedAt || product.updated_at,
  isSold: product.isSold || product.is_sold || product.status === 'sold',
  status: product.status || (product.isSold || product.is_sold ? 'sold' : 'available')
});

// Helper function to transform seller data
const transformSeller = (data: any): Seller => {
  // Handle case where seller data is nested under a 'seller' property
  const seller = data.seller || data;
  
  return {
    id: seller.id,
    fullName: seller.fullName || seller.full_name || '',
    email: seller.email || '',
    phone: seller.phone || '',
    createdAt: seller.createdAt || seller.created_at || new Date().toISOString(),
    updatedAt: seller.updatedAt || seller.updated_at || new Date().toISOString()
  };
};

// API methods
export const sellerApi = {
  // Auth
  login: async (credentials: { email: string; password: string }): Promise<{ seller: Seller; token: string }> => {
    try {
      const response = await sellerApiInstance.post('/sellers/login', credentials);
      const { data: responseData } = response.data;
      
      if (!responseData) {
        throw new Error('Invalid response from server');
      }
      
      const { seller, token } = responseData;
      
      if (!seller || !token) {
        throw new Error('Invalid response from server - missing seller or token');
      }
      
      localStorage.setItem('sellerToken', token);
      return { seller: transformSeller(seller), token };
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  register: async (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ seller: Seller; token: string }> => {
    try {
      const response = await sellerApiInstance.post('/sellers/register', data);
      const responseData = response.data?.data || response.data;
      
      if (!responseData) {
        throw new Error('Invalid response from server');
      }
      
      const { seller, token } = responseData;
      
      if (!seller || !token) {
        throw new Error('Invalid response from server - missing seller or token');
      }
      
      localStorage.setItem('sellerToken', token);
      return { seller: transformSeller(seller), token };
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  // Products
  createProduct: async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'isSold'>): Promise<Product> => {
    const response = await sellerApiInstance.post('/sellers/products', product);
    return transformProduct(response.data);
  },

  getProducts: async (): Promise<Product[]> => {
    try {
      const response = await sellerApiInstance.get('/sellers/products');
      const { data } = response.data;
      return (data?.products || []).map(transformProduct);
    } catch (error: any) {
      console.error('Error fetching products:', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  getProduct: async (id: string): Promise<Product> => {
    try {
      const response = await sellerApiInstance.get(`/sellers/products/${id}`);
      const { data } = response.data;
      if (!data) {
        throw new Error('Product not found');
      }
      return transformProduct(data);
    } catch (error: any) {
      console.error('Error fetching product:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  updateProduct: async (id: string, updates: Partial<Product>): Promise<Product> => {
    const response = await sellerApiInstance.patch(`/sellers/products/${id}`, updates);
    return transformProduct(response.data);
  },

  deleteProduct: async (id: string): Promise<void> => {
    await sellerApiInstance.delete(`/sellers/products/${id}`);
  },

  // Seller
  getProfile: async (): Promise<Seller> => {
    try {
      const response = await sellerApiInstance.get('/sellers/profile');
      const { data } = response.data;
      if (!data) {
        throw new Error('No profile data received');
      }
      return transformSeller(data);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  getSellerById: async (id: string | number): Promise<Seller> => {
    try {
      const response = await sellerApiInstance.get(`/sellers/${id}`);
      const { data } = response.data;
      if (!data) {
        throw new Error('No seller data received');
      }
      return transformSeller(data);
    } catch (error: any) {
      console.error('Error fetching seller:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  // Orders
  getOrders: async (): Promise<Order[]> => {
    const response = await sellerApiInstance.get('/sellers/orders');
    return response.data.orders || [];
  },

  updateOrderStatus: async (orderId: string, status: string): Promise<Order> => {
    const response = await sellerApiInstance.patch(`/orders/${orderId}/status`, { status });
    return response.data;
  },

  // Analytics
  getAnalytics: async (): Promise<SellerAnalytics> => {
    const response = await sellerApiInstance.get('/sellers/analytics');
    return response.data.data;
  },

  // Auth - Forgot Password
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    try {
      // Use the public API endpoint directly
      const response = await axios.post(`${API_URL}/sellers/forgot-password`, { 
        email: email.trim().toLowerCase() 
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return response.data;
    } catch (error: any) {
      console.error('Forgot password error:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  },

  // Reset Password
  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    try {
      const response = await axios.post(
        `${API_URL}/sellers/reset-password`,
        { token, newPassword },
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          } 
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Reset password error:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('An unknown error occurred while resetting your password.');
    }
  },
};

export default sellerApi;
