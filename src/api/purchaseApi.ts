import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

// Create axios instance with base config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('sellerToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface PurchaseRequest {
  productId: string;
  quantity: number;
  shippingAddress: string;
  paymentMethod: string;
}

export interface PurchaseResponse {
  id: string;
  orderNumber: string;
  status: 'pending' | 'completed' | 'failed';
  message?: string;
}

export interface TicketValidationResponse {
  valid: boolean;
  status: 'valid' | 'not_found' | 'already_scanned';
  ticket?: {
    id: string;
    ticketNumber: string;
    eventName: string;
    customerName: string;
    scanned: boolean;
    scannedAt?: string;
  };
  message: string;
}

export const purchaseApi = {
  async purchaseProduct(purchaseData: PurchaseRequest): Promise<PurchaseResponse> {
    try {
      const response = await api.post('/purchases', purchaseData);
      return response.data;
    } catch (error: any) {
      console.error('Purchase failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to complete purchase');
    }
  },

  async validateTicket(ticketNumber: string): Promise<TicketValidationResponse> {
    try {
      // Use the public API URL for validation
      const response = await api.get(
        `/tickets/validate/${encodeURIComponent(ticketNumber)}`,
        {
          baseURL: API_URL,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Ticket validation failed:', error);
      return {
        valid: false,
        status: 'not_found',
        message: error.response?.data?.message || 'Failed to validate ticket'
      };
    }
  },

  async getPurchaseStatus(orderId: string): Promise<PurchaseResponse> {
    try {
      const response = await api.get(`/purchases/${orderId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch purchase status:', error);
      throw new Error('Failed to fetch purchase status');
    }
  }
};
