
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Clock, Users, Ticket, User, ShoppingCart, DollarSign, Activity, Store, UserPlus, Eye, MoreHorizontal, Loader2, Plus, Package, X, ShoppingBag, UserCheck, Box } from 'lucide-react';
import { adminApi } from '@/api/adminApi';
import { format } from 'date-fns';

// Custom tooltip for the events chart
const EventsTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-800 p-4 border border-gray-700 rounded-lg shadow-lg">
        <p className="font-medium text-white">{data.fullDate || label}</p>
        <p className="text-sm text-gray-300">
          <span className="text-blue-400">Events:</span> {data.count.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

// Types
interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
  trend: number;
}

interface MonthlyEventData {
  month: string;
  event_count: number;
}

interface DashboardAnalytics {
  totalRevenue?: number;
  totalEvents?: number;
  totalOrganizers?: number;
  totalProducts?: number;
  totalSellers?: number;
  monthlyGrowth?: {
    revenue?: number;
    events?: number;
    organizers?: number;
    products?: number;
    sellers?: number;
  };
}

interface MonthlyMetricsData {
  month: string;
  sellerCount: number;
  productCount: number;
  soldCount: number;
}

interface DashboardState {
  analytics: DashboardAnalytics;
  recentEvents: Array<{
    id: string;
    title: string;
    date: string;
    end_date?: string;
    venue?: string;
    location?: string;
    status: string;
    organizer_name?: string;
    attendees_count?: number;
    revenue?: number;
  }>;
  sellers: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    phone?: string;
    createdAt: string;
  }>;
  organizers: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    status: string;
    createdAt: string;
  }>;
  monthlyEvents: MonthlyEventData[];
  monthlyMetrics: MonthlyMetricsData[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// StatsCard Component
const StatsCard = React.memo(({ title, value, icon, description, trend }: StatsCardProps) => {
  const isPositive = trend >= 0;
  const trendColor = isPositive ? 'text-green-400' : 'text-red-400';
  const trendIcon = isPositive ? '↑' : '↓';

  return (
    <Card className="bg-gray-800 border-gray-700 hover:border-yellow-500/50 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-300">
          {title}
        </CardTitle>
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${isPositive ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        <p className="text-xs text-gray-400 mt-1">
          <span className={`${trendColor} font-medium`}>
            {trendIcon} {Math.abs(trend)}%
          </span>{' '}
          <span className="text-gray-500">vs last month</span>
        </p>
      </CardContent>
    </Card>
  );
});

// Main Dashboard Component
// Format date for display with proper validation
const formatDate = (dateString: string | Date | undefined | null): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) ? format(date, 'MMM d, yyyy h:mm a') : 'N/A';
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

const NewAdminDashboard = () => {
  // All hooks must be called unconditionally at the top level
  const { isAuthenticated, loading: authLoading } = useAdminAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize state for dashboard data with proper typing
  // State for ticket buyers modal
  const [selectedEvent, setSelectedEvent] = useState<{id: string, title: string} | null>(null);
  const [ticketBuyers, setTicketBuyers] = useState<Array<{
    id: string;
    name: string;
    email: string;
    ticketType: string;
    ticketTypeId: string;
    ticketStatus: string;
    isScanned: boolean;
    quantity: number;
    purchaseDate: string;
  }>>([]);
  const [ticketTypes, setTicketTypes] = useState<Record<string, string>>({});
  const [isLoadingBuyers, setIsLoadingBuyers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dashboardState, setDashboardState] = React.useState<DashboardState>({
    analytics: {
      totalRevenue: 0,
      totalEvents: 0,
      totalOrganizers: 0,
      totalProducts: 0,
      monthlyGrowth: {
        revenue: 0,
        events: 0,
        organizers: 0,
        products: 0
      }
    },
    recentEvents: [],
    sellers: [],
    organizers: [],
    monthlyEvents: [],
    monthlyMetrics: []
  });

  // Fetch dashboard data in a separate effect
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const fetchData = async () => {
      console.log('Starting to fetch dashboard data...');
      try {
        const [
          analytics, 
          events, 
          sellers, 
          organizers, 
          monthlyEvents,
          monthlyMetrics
        ] = await Promise.all([
          adminApi.getAnalytics().then(data => {
            console.log('Analytics data received:', data);
            return data;
          }),
          adminApi.getEvents().then(data => {
            console.log('Events data received:', data);
            return data;
          }),
          adminApi.getSellers().then(data => {
            console.log('Sellers data received:', data);
            return data;
          }),
          adminApi.getOrganizers().then(data => {
            console.log('Organizers data received:', data);
            return data;
          }),
          adminApi.getMonthlyEvents().then(data => {
            console.log('Monthly events data received:', data);
            return data;
          }),
          adminApi.getMonthlyMetrics().then(data => {
            console.log('Monthly metrics data received:', data);
            return data;
          })
        ]);

        // Ensure we have safe defaults if any data is missing
        const totalSellers = Array.isArray(sellers) ? sellers.length : 0;
        const safeAnalytics: DashboardAnalytics = {
          totalRevenue: analytics?.totalRevenue || 0,
          totalEvents: analytics?.totalEvents || 0,
          totalOrganizers: analytics?.totalOrganizers || 0,
          totalProducts: analytics?.totalProducts || 0,
          totalSellers: totalSellers,
          monthlyGrowth: {
            revenue: analytics?.monthlyGrowth?.revenue || 0,
            events: analytics?.monthlyGrowth?.events || 0,
            organizers: analytics?.monthlyGrowth?.organizers || 0,
            products: analytics?.monthlyGrowth?.products || 0,
            sellers: analytics?.monthlyGrowth?.sellers || 0
          }
        };
        
        console.log('Total sellers calculated:', totalSellers);

        setDashboardState({
          analytics: safeAnalytics,
          recentEvents: Array.isArray(events) ? events.slice(0, 5) : [],
          sellers: Array.isArray(sellers) ? sellers : [],
          organizers: Array.isArray(organizers) ? organizers : [],
          monthlyEvents: Array.isArray(monthlyEvents) ? monthlyEvents : [],
          monthlyMetrics: Array.isArray(monthlyMetrics?.data) ? monthlyMetrics.data : []
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setIsInitialized(true);
      }
    };

    fetchData();
  }, [authLoading, isAuthenticated]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/admin/login', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Stats cards data with proper type safety
  const statsCards: StatsCardProps[] = [
    {
      title: 'Total Events',
      value: dashboardState.analytics.totalEvents.toLocaleString(),
      icon: <Calendar className="h-4 w-4 text-blue-500" />,
      description: 'Active events',
      trend: dashboardState.analytics.monthlyGrowth?.events ?? 0
    },
    {
      title: 'Total Organizers',
      value: dashboardState.analytics.totalOrganizers.toLocaleString(),
      icon: <Users className="h-4 w-4 text-green-500" />,
      description: 'Registered organizers',
      trend: dashboardState.analytics.monthlyGrowth?.organizers ?? 0
    },
    {
      title: 'Total Products',
      value: dashboardState.analytics.totalProducts.toLocaleString(),
      icon: <Package className="h-4 w-4 text-orange-500" />,
      description: 'Available products',
      trend: dashboardState.analytics.monthlyGrowth?.products ?? 0
    },
    {
      title: 'Total Sellers',
      value: dashboardState.analytics.totalSellers?.toLocaleString() || '0',
      icon: <ShoppingCart className="h-4 w-4 text-purple-500" />,
      description: 'Active sellers',
      trend: dashboardState.analytics.monthlyGrowth?.sellers ?? 0
    },
  ];

    // Format metrics data for the chart
  const metricsData = useMemo(() => {
    if (!dashboardState.monthlyMetrics?.length) return [];
    
    return dashboardState.monthlyMetrics.map(metric => ({
      name: new Date(metric.month).toLocaleString('default', { month: 'short' }),
      fullDate: new Date(metric.month).toLocaleString('default', { month: 'long', year: 'numeric' }),
      sellers: metric.sellerCount || 0,
      products: metric.productCount || 0,
      sold: metric.soldCount || 0
    }));
  }, [dashboardState.monthlyMetrics]);
  
  // Custom tooltip for metrics chart
  const MetricsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 p-4 border border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-white">{data.fullDate || label}</p>
          {payload.map((entry: any) => (
            <p key={entry.dataKey} className="text-sm text-gray-300 mt-1">
              <span style={{ color: entry.color }}>
                {entry.dataKey === 'sellers' ? (
                  <UserCheck className="w-3 h-3 inline mr-1" />
                ) : entry.dataKey === 'products' ? (
                  <Package className="w-3 h-3 inline mr-1" />
                ) : (
                  <ShoppingBag className="w-3 h-3 inline mr-1" />
                )}
                {entry.dataKey.charAt(0).toUpperCase() + entry.dataKey.slice(1)}:
              </span>{' '}
              {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Format event data for the chart
  const eventsData = useMemo(() => {
    // Always return an array, even if empty
    if (!dashboardState.monthlyEvents?.length) {
      return [];
    }
    
    try {
      // Format the data for the chart
      return dashboardState.monthlyEvents.map(event => ({
        name: new Date(event.month).toLocaleString('default', { month: 'short' }),
        fullDate: new Date(event.month).toLocaleString('default', { month: 'long', year: 'numeric' }),
        count: event.event_count || 0
      }));
    } catch (error) {
      console.error('Error formatting event data:', error);
      return [];
    }
  }, [dashboardState.monthlyEvents]);

  // Show loading state while checking auth or loading data
  if (authLoading || !isAuthenticated || !isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }
  
  // Loading and error states are already handled at the top of the component

  // Event categories data for pie chart
  const eventCategories = [
    { name: 'Music', value: 400 },
    { name: 'Sports', value: 300 },
    { name: 'Business', value: 300 },
    { name: 'Food & Drink', value: 200 },
    { name: 'Other', value: 100 },
  ];

  // Fetch ticket types for an event
  const fetchTicketTypes = async (eventId: string) => {
    try {
      console.log('Fetching ticket types for event:', eventId);
      const response = await adminApi.getEventTicketTypes(eventId);
      const types: Record<string, string> = {};
      
      // If no ticket types, log and return empty object
      if (!response.data?.ticketTypes || response.data.ticketTypes.length === 0) {
        console.warn('No ticket types found for event:', eventId);
        return {};
      }
      
      console.log('Received ticket types:', response.data.ticketTypes);
      
      // Create a mapping of ticket type IDs to their names
      response.data.ticketTypes.forEach((type: any) => {
        const typeId = type?.id?.toString();
        if (typeId && type?.name) {
          types[typeId] = type.name;
          console.log(`Mapped ticket type: ${typeId} -> ${type.name}`);
        }
      });
      
      setTicketTypes(types);
      return types;
    } catch (error) {
      console.warn('Error fetching ticket types, continuing without them:', error);
      return {};
    }
  };

  // Fetch ticket buyers for an event from the database
  const fetchTicketBuyers = async (eventId: string) => {
    try {
      setIsLoadingBuyers(true);
      setError(null);
      
      // Fetch ticket buyers from the API (now includes ticket type information)
      const response = await adminApi.getEventTicketBuyers(eventId);
      
      // Extract the tickets array from the response
      const tickets = response.data?.tickets || [];
      
      console.log('Fetched tickets with types:', tickets);
      
      // Transform the ticket data to match our expected format
      const buyers = tickets.map((ticket) => {
        // Use the ticket type information from the API response
        const ticketTypeName = ticket.ticketType?.displayName || ticket.ticketType?.name || 'General Admission';
        const ticketTypeId = ticket.ticketType?.id || 'unknown';
        
        // Log any tickets with missing type information for debugging
        if (!ticket.ticketType) {
          console.warn('Ticket is missing type information:', ticket);
        }
        
        return {
          id: ticket.id?.toString() || Math.random().toString(36).substr(2, 9),
          name: ticket.customerName || 'Anonymous',
          email: ticket.customerEmail || 'No email provided',
          ticketType: ticketTypeName,
          ticketTypeId: ticketTypeId || 'general',
          ticketStatus: ticket.status || 'Valid',
          isScanned: ticket.scanned || false,
          quantity: 1, // Default to 1 since we're dealing with individual tickets
          purchaseDate: new Date(ticket.createdAt || new Date()).toISOString()
        };
      });
      
      setTicketBuyers(buyers);
    } catch (error: any) {
      console.error('Error fetching ticket buyers:', error);
      setError(error.message || 'Failed to load ticket buyers');
    } finally {
      setIsLoadingBuyers(false);
    }
  };

  // Handle view button click
  const handleViewEvent = (event: {id: string, title: string}) => {
    setSelectedEvent(event);
    fetchTicketBuyers(event.id);
  };

  // Close ticket buyers modal
  const closeTicketBuyersModal = () => {
    setSelectedEvent(null);
    setTicketBuyers([]);
    setTicketTypes({});
  };

  // Loading and error states are now handled at the top of the component

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Spinner className="h-8 w-8 text-yellow-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate('/admin/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      {/* Ticket Buyers Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-xl font-semibold text-white">
                Ticket Buyers - {selectedEvent.title}
              </h3>
              <button 
                onClick={closeTicketBuyersModal}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="overflow-auto flex-1 p-4">
              {isLoadingBuyers ? (
                <div className="flex items-center justify-center h-40">
                  <Spinner className="h-8 w-8 text-yellow-500" />
                </div>
              ) : error ? (
                <div className="text-red-400 p-4 bg-red-900 bg-opacity-30 rounded-lg">
                  Error loading ticket buyers: {error}
                </div>
              ) : ticketBuyers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No ticket buyers found for this event.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                        <th className="pb-3 font-medium">Name</th>
                        <th className="pb-3 font-medium">Email</th>
                        <th className="pb-3 font-medium text-center">Ticket Type</th>
                        <th className="pb-3 font-medium text-center">Status</th>
                        <th className="pb-3 font-medium text-center">Scanned</th>
                        <th className="pb-3 font-medium text-center">Quantity</th>
                        <th className="pb-3 font-medium text-right">Purchase Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {ticketBuyers.map((buyer) => (
                        <tr key={buyer.id} className="hover:bg-gray-750 transition-colors">
                          <td className="py-3 text-white">{buyer.name}</td>
                          <td className="py-3 text-gray-300">{buyer.email}</td>
                          <td className="py-3 text-center">
                            <Badge variant="outline" className="bg-yellow-900 bg-opacity-30 text-yellow-300 border-yellow-800">
                              {buyer.ticketType}
                            </Badge>
                          </td>
                          <td className="py-3 text-center">
                            <Badge variant="outline" className={
                              buyer.ticketStatus === 'Valid' 
                                ? 'bg-green-900 bg-opacity-30 text-green-300 border-green-800'
                                : buyer.ticketStatus === 'Used'
                                ? 'bg-blue-900 bg-opacity-30 text-blue-300 border-blue-800'
                                : 'bg-gray-700 text-gray-300 border-gray-600'
                            }>
                              {buyer.ticketStatus}
                            </Badge>
                          </td>
                          <td className="py-3 text-center">
                            <Badge variant="outline" className={
                              buyer.isScanned 
                                ? 'bg-purple-900 bg-opacity-30 text-purple-300 border-purple-800'
                                : 'bg-gray-700 text-gray-300 border-gray-600'
                            }>
                              {buyer.isScanned ? 'Yes' : 'No'}
                            </Badge>
                          </td>
                          <td className="py-3 text-center text-gray-300">
                            {buyer.quantity}
                          </td>
                          <td className="py-3 text-right text-gray-300">
                            {format(new Date(buyer.purchaseDate), 'MMM d, yyyy h:mm a')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-700 flex justify-end">
              <Button 
                variant="outline" 
                onClick={closeTicketBuyersModal}
                className="border-gray-600 text-black hover:bg-gray-700"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-300">Welcome back, Admin</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 mb-8 md:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-gray-800 border border-gray-700 p-1 rounded-lg">
            <TabsTrigger 
              value="overview" 
              className="rounded-md px-4 py-2 data-[state=active]:bg-yellow-500 data-[state=active]:text-gray-900 text-gray-300 hover:text-white transition-colors"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="events" 
              className="rounded-md px-4 py-2 data-[state=active]:bg-yellow-500 data-[state=active]:text-gray-900 text-gray-300 hover:text-white transition-colors"
            >
              Events
            </TabsTrigger>
            <TabsTrigger 
              value="organizers" 
              className="rounded-md px-4 py-2 data-[state=active]:bg-yellow-500 data-[state=active]:text-gray-900 text-gray-300 hover:text-white transition-colors"
            >
              Organizers
            </TabsTrigger>
            <TabsTrigger 
              value="sellers" 
              className="rounded-md px-4 py-2 data-[state=active]:bg-yellow-500 data-[state=active]:text-gray-900 text-gray-300 hover:text-white transition-colors"
            >
              Sellers
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Events Chart */}
                <Card className="bg-gray-800 border-gray-700 overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white text-lg">Monthly Event Counts</CardTitle>
                        <CardDescription className="text-gray-300 text-sm">Monthly event counts performance</CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                          <span className="text-xs text-gray-400">Events</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="h-[300px] w-full">
                      {eventsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={eventsData}>
                            <defs>
                              <linearGradient id="eventBarGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                            <XAxis 
                              dataKey="name"
                              stroke="#9CA3AF"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                              tickMargin={10}
                            />
                            <YAxis 
                              stroke="#9CA3AF"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                              tickMargin={10}
                              width={30}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: '#1F2937',
                                border: '1px solid #374151',
                                borderRadius: '0.5rem',
                                padding: '0.75rem',
                              }}
                              labelStyle={{ color: '#E5E7EB', fontWeight: '500' }}
                              itemStyle={{ color: '#E5E7EB', padding: '4px 0' }}
                            />
                            <Bar 
                              dataKey="count" 
                              fill="url(#eventBarGradient)" 
                              radius={[4, 4, 0, 0]}
                              barSize={24}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          No event data available
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Metrics Chart */}
                <Card className="bg-gray-800 border-gray-700 overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white text-lg">Monthly Metrics</CardTitle>
                        <CardDescription className="text-gray-300 text-sm">Sellers, Products & Sales Performance</CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-purple-500 mr-1"></div>
                          <span className="text-xs text-gray-400">Sellers</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                          <span className="text-xs text-gray-400">Products</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div>
                          <span className="text-xs text-gray-400">Sold</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="h-[300px] w-full">
                      {metricsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={metricsData}>
                            <defs>
                              <linearGradient id="colorSellers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.1}/>
                              </linearGradient>
                              <linearGradient id="colorProducts" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#4ade80" stopOpacity={0.1}/>
                              </linearGradient>
                              <linearGradient id="colorSold" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#facc15" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#facc15" stopOpacity={0.1}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#9CA3AF', fontSize: 12 }}
                              tickMargin={10}
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#9CA3AF', fontSize: 12 }}
                              tickMargin={10}
                              width={40}
                              tickFormatter={(value) => value.toLocaleString()}
                              domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]}
                            />
                            <Tooltip 
                              content={<MetricsTooltip />}
                              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="sellers" 
                              stroke="#a78bfa" 
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 6, stroke: '#7c3aed', strokeWidth: 2, fill: '#a78bfa' }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="products" 
                              stroke="#4ade80" 
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 6, stroke: '#16a34a', strokeWidth: 2, fill: '#4ade80' }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="sold" 
                              stroke="#facc15" 
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 6, stroke: '#d97706', strokeWidth: 2, fill: '#facc15' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-gray-400">No metrics data available</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Events */}
              <Card className="bg-gray-800 border-gray-700 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-lg">Recent Events</CardTitle>
                  <CardDescription className="text-gray-300 text-sm">Latest events created in the system</CardDescription>
                </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-4">
                  {dashboardState.recentEvents?.map((event) => (
                    <div 
                      key={event.id} 
                      className="flex items-start justify-between p-4 border border-gray-700 rounded-lg hover:bg-gray-750 transition-colors"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="p-2 bg-yellow-500 bg-opacity-10 rounded-lg">
                          <Calendar className="h-5 w-5 text-yellow-300" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{event.title}</h4>
                          <p className="text-sm text-gray-400">
                            {(event.date && !isNaN(new Date(event.date).getTime())) ? format(new Date(event.date), 'MMM d, yyyy') : 'Invalid date'} • {event.venue}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`${
                          event.status === 'active' 
                            ? 'bg-green-900 bg-opacity-30 text-green-300 border-green-800' 
                            : 'bg-gray-700 text-gray-300 border-gray-600'
                        }`}
                      >
                        {event.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="border-t border-gray-700 p-4">
                <Button 
                  variant="ghost" 
                  className="text-yellow-400 hover:bg-yellow-500 hover:bg-opacity-10 text-sm"
                >
                  View all events
                </Button>
              </CardFooter>
            </Card>
          </div>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-lg">Events Overview</CardTitle>
                    <CardDescription className="text-gray-300 text-sm">Manage all events in the platform</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1 bg-gray-800 border-gray-600 text-gray-300">
                      <Calendar className="h-3 w-3" />
                      <span className="text-xs">Last 12 months</span>
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                        <th className="pb-3 font-medium">Event</th>
                        <th className="pb-3 font-medium">Date & Time</th>
                        <th className="pb-3 font-medium">Location</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium text-right">Attendees</th>
                        <th className="pb-3 font-medium text-right">Revenue</th>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {dashboardState.recentEvents?.map((event) => (
                        <tr key={event.id} className="hover:bg-gray-750 transition-colors">
                          <td className="py-3">
                            <div className="font-medium text-white">{event.title}</div>
                            <div className="text-xs text-gray-400">{event.organizer_name || 'No Organizer'}</div>
                          </td>
                          <td className="py-3">
                            <div className="text-white">{format(new Date(event.date), 'MMM d, yyyy')}</div>
                            <div className="text-xs text-gray-400">
                              {(event.date && !isNaN(new Date(event.date).getTime())) ? format(new Date(event.date), 'h:mm a') : 'Invalid time'}
                              {event.end_date && !isNaN(new Date(event.end_date).getTime()) ? ` - ${format(new Date(event.end_date), 'h:mm a')}` : ''}
                            </div>
                          </td>
                          <td className="py-3 text-gray-300">
                            {event.location || 'N/A'}
                          </td>
                          <td className="py-3">
                            <Badge 
                              variant="outline"
                              className={
                                event.status === 'Active' || event.status === 'Ongoing'
                                  ? 'bg-green-900 bg-opacity-30 text-green-300 border-green-800'
                                  : event.status === 'Upcoming'
                                  ? 'bg-blue-900 bg-opacity-30 text-blue-300 border-blue-800'
                                  : 'bg-gray-700 text-gray-300 border-gray-600'
                              }
                            >
                              {event.status}
                            </Badge>
                          </td>
                          <td className="py-3 text-right text-gray-300">
                            {event.attendees_count?.toLocaleString() || '0'}
                          </td>
                          <td className="py-3 text-right">
                            <div className="font-medium text-white">
                              ${event.revenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                            </div>
                          </td>
                          <td className="py-3 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-yellow-400 hover:bg-yellow-500 hover:bg-opacity-10"
                              onClick={() => handleViewEvent({id: event.id, title: event.title})}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="border-t border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between w-full text-sm text-gray-400">
                  <div className="text-sm text-gray-400">
                    Showing <span className="text-white font-medium">{dashboardState.recentEvents?.length || 0}</span> of {dashboardState.recentEvents?.length || 0} events
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" disabled={true} className="text-gray-400 hover:bg-gray-700 h-8 w-8 p-0">
                      &larr;
                    </Button>
                    <Button variant="ghost" size="sm" className="bg-gray-700 text-white h-8 w-8 p-0">
                      1
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:bg-gray-700 h-8 w-8 p-0">
                      &rarr;
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Organizers Tab */}
          <TabsContent value="organizers" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700 overflow-hidden">
              <CardHeader className="pb-2">
                <div>
                  <CardTitle className="text-white text-lg">Organizers</CardTitle>
                  <CardDescription className="text-gray-300 text-sm">
                    Manage all event organizers in the platform
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                        <th className="pb-3 font-medium">Name</th>
                        <th className="pb-3 font-medium">Email</th>
                        <th className="pb-3 font-medium">Phone</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {dashboardState.organizers?.map((organizer) => (
                        <tr key={organizer.id} className="hover:bg-gray-750 transition-colors">
                          <td className="py-3 text-white">{organizer.name}</td>
                          <td className="py-3 text-gray-300">{organizer.email}</td>
                          <td className="py-3 text-gray-300">{organizer.phone || 'N/A'}</td>
                          <td className="py-3">
                            <Badge 
                              variant="outline"
                              className={
                                organizer.status === 'Active' 
                                  ? 'bg-green-900 bg-opacity-30 text-green-300 border-green-800'
                                  : 'bg-gray-700 text-gray-300 border-gray-600'
                              }
                            >
                              {organizer.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="border-t border-gray-700 px-6 py-4">
                <div className="text-sm text-gray-400">
                  Showing <span className="text-white font-medium">{dashboardState.organizers?.length || 0}</span> {dashboardState.organizers?.length === 1 ? 'organizer' : 'organizers'}
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Sellers Tab */}
          <TabsContent value="sellers" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700 overflow-hidden">
              <CardHeader className="pb-2">
                <div>
                  <CardTitle className="text-white text-lg">Sellers</CardTitle>
                  <CardDescription className="text-gray-300 text-sm">
                    Manage all sellers in the platform
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                        <th className="pb-3 font-medium">Name</th>
                        <th className="pb-3 font-medium">Email</th>
                        <th className="pb-3 font-medium">Phone</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {dashboardState.sellers?.map((seller) => (
                        <tr key={seller.id} className="hover:bg-gray-750 transition-colors">
                          <td className="py-3 text-white">{seller.name}</td>
                          <td className="py-3 text-gray-300">{seller.email}</td>
                          <td className="py-3 text-gray-300">{seller.phone || 'N/A'}</td>
                          <td className="py-3">
                            <Badge 
                              variant="outline"
                              className={
                                seller.status === 'Active' 
                                  ? 'bg-green-900 bg-opacity-30 text-green-300 border-green-800'
                                  : 'bg-gray-700 text-gray-300 border-gray-600'
                              }
                            >
                              {seller.status}
                            </Badge>
                          </td>
                          <td className="py-3 text-right">
                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="border-t border-gray-700 px-6 py-4">
                <div className="text-sm text-gray-400">
                  Showing <span className="text-white font-medium">{dashboardState.sellers?.length || 0}</span> {dashboardState.sellers?.length === 1 ? 'seller' : 'sellers'}
                </div>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default NewAdminDashboard;

