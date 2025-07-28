import axios from 'axios';

// Default API configuration
// Include /api in the base URL since our routes are prefixed with /api
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002') + '/api';
console.log('Using API base URL:', API_BASE_URL);

// Helper function to determine product status based on stock
function getProductStatus(stock: number): 'In Stock' | 'Low Stock' | 'Out of Stock' {
  if (stock <= 0) return 'Out of Stock';
  if (stock <= 10) return 'Low Stock';
  return 'In Stock';
}

// Helper function to determine event status
function getEventStatus(
  startDate?: string, 
  endDate?: string, 
  status?: string
): 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled' {
  if (status) {
    // If status is explicitly provided and valid, use it
    const validStatuses = ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'] as const;
    if (validStatuses.includes(status as any)) {
      return status as any;
    }
  }

  // Otherwise determine status based on dates
  if (!startDate) return 'Upcoming';
  
  const now = new Date();
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  if (now < start) return 'Upcoming';
  if (end && now > end) return 'Completed';
  return 'Ongoing';
}

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for sending cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 Unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear the token and redirect to login
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_authenticated');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

// Admin API methods
const adminApi = {
  // Admin login
  async login(pin: string) {
    try {
      console.log('Starting admin login with PIN:', pin);
      const response = await api.post('/admin/login', { pin });
      console.log('Login response:', response.data);
      
      // Store the token in localStorage if it exists in the response
      if (response.data?.data?.token) {
        localStorage.setItem('admin_token', response.data.data.token);
        localStorage.setItem('admin_authenticated', 'true');
        console.log('Token stored in localStorage');
      } else {
        console.warn('No token found in login response');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  },

  logout(): void {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_authenticated');
  },

  isAuthenticated(): boolean {
    const token = localStorage.getItem('admin_token');
    console.log('Checking authentication, token exists:', !!token);
    return !!token;
  },

  // Sellers
  async getSellers() {
    try {
      console.log('Fetching sellers from API...');
      const { data } = await api.get('/admin/sellers');
      console.log('Raw API response:', data);
      
      const sellers = data.data.map((seller: any) => ({
        id: seller.id,
        name: seller.name || seller.full_name || 'Unnamed Seller',
        email: seller.email,
        phone: seller.phone || '',
        status: seller.status || 'Active',
        createdAt: seller.created_at || new Date().toISOString(),
      }));
      
      console.log('Processed sellers:', sellers);
      return sellers;
    } catch (error) {
      console.error('Error fetching sellers:', error);
      throw error;
    }
  },

  // Events
  async getEvents() {
    try {
      console.log('Fetching events from API...');
      const response = await api.get('/admin/events');
      console.log('Raw API response:', response);
      
      if (!response.data || !Array.isArray(response.data.data)) {
        console.error('Unexpected API response format:', response);
        return [];
      }
      
      const events = response.data.data.map((event: any) => {
        const mappedEvent = {
          id: event.id,
          title: event.title || event.name || 'Untitled Event',
          start_date: event.start_date,
          end_date: event.end_date,
          date: event.start_date || event.date,
          location: event.location || 'Location not specified',
          status: getEventStatus(event.start_date, event.end_date, event.status),
          attendees: event.attendees || event.attendees_count || 0,
          attendees_count: event.attendees_count || event.attendees || 0,
          revenue: parseFloat(event.revenue || 0),
          // Include all original fields for debugging
          _raw: event,
          // Backward compatibility
          ticketsSold: event.tickets_sold || 0,
          organizer_name: event.organizer_name || 'Unknown Organizer',
          description: event.description || ''
        };
        console.log('Mapped event:', mappedEvent);
        return mappedEvent;
      });
      
      return events;
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  },

  // Products
  async getProducts() {
    try {
      const { data } = await api.get('/admin/products');
      return data.data.map((product: any) => ({
        id: product.id,
        name: product.name,
        price: parseFloat(product.price || 0),
        stock: parseInt(product.stock || 0, 10),
        status: getProductStatus(parseInt(product.stock || 0, 10)),
      }));
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Organizers
  async getOrganizers() {
    try {
      const { data } = await api.get('/admin/organizers');
      return data.data.map((organizer: any) => ({
        id: organizer.id,
        name: organizer.full_name || organizer.name || 'Unnamed Organizer',
        email: organizer.email,
        phone: organizer.phone || '',
        status: organizer.status || 'Active',
        createdAt: organizer.created_at || new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error fetching organizers:', error);
      throw error;
    }
  },

  // Get ticket types for an event
  getEventTicketTypes: async (eventId: string | number) => {
    try {
      const response = await api.get(`/events/public/${eventId}/ticket-types`);
      return response.data;
    } catch (error) {
      console.error('Error fetching event ticket types:', error);
      throw error;
    }
  },

  // Get ticket buyers for an event
  getEventTicketBuyers: async (eventId: string | number) => {
    try {
      const response = await api.get(`/admin/events/${eventId}/tickets`);
      // Map the response to match what the frontend expects
      return {
        data: {
          tickets: response.data.data.tickets || []
        }
      };
    } catch (error) {
      console.error('Error fetching event ticket buyers:', error);
      throw error;
    }
  },

  // Get monthly event counts
  async getMonthlyEvents() {
    try {
      const { data } = await api.get('/admin/events/monthly');
      return data.data || [];
    } catch (error) {
      console.error('Error fetching monthly events:', error);
      // Return empty array if API call fails
      return [];
    }
  },

  // Dashboard Analytics
  async getAnalytics() {
    try {
      // Get analytics from the admin dashboard endpoint
      const { data } = await api.get('/admin/dashboard');
      const responseData = data.data || data;
      
      return {
        totalSellers: responseData.total_sellers || 0,
        totalProducts: responseData.total_products || 0,
        totalOrganizers: responseData.total_organizers || 0,
        totalEvents: responseData.total_events || 0,
        totalRevenue: parseFloat(responseData.total_revenue || 0),
        monthlyGrowth: {
          sellers: responseData.monthly_growth?.sellers || 0,
          products: responseData.monthly_growth?.products || 0,
          organizers: responseData.monthly_growth?.organizers || 0,
          events: responseData.monthly_growth?.events || 0,
          revenue: responseData.monthly_growth?.revenue || 0,
        },
        recentActivities: responseData.recent_activities || [],
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Return default values if analytics endpoint fails
      return {
        totalSellers: 0,
        totalProducts: 0,
        totalOrganizers: 0,
        totalEvents: 0,
        totalRevenue: 0,
        monthlyGrowth: {
          sellers: 0,
          products: 0,
          organizers: 0,
          events: 0,
          revenue: 0,
        },
        recentActivities: [],
      };
    }
  },
};

export default adminApi;
