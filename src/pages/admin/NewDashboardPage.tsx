
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Clock, Users, Ticket, User, ShoppingCart, DollarSign, Activity, Store, UserPlus, Eye, MoreHorizontal, Loader2, Plus, Package, X } from 'lucide-react';
import adminApi from '@/api/adminApi';
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
  monthlyGrowth?: {
    revenue?: number;
    events?: number;
    organizers?: number;
    products?: number;
  };
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
    created_at: string;
  }>;
  monthlyEvents: MonthlyEventData[];
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
    monthlyEvents: []
  });

  // Fetch dashboard data in a separate effect
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const fetchData = async () => {
      try {
        const [analytics, events, sellers, organizers, monthlyEvents] = await Promise.all([
          adminApi.getAnalytics(),
          adminApi.getEvents(),
          adminApi.getSellers(),
          adminApi.getOrganizers(),
          adminApi.getMonthlyEvents(),
        ]);

        // Ensure we have valid data before updating state
        const safeAnalytics: DashboardAnalytics = {
          totalRevenue: analytics?.totalRevenue || 0,
          totalEvents: analytics?.totalEvents || 0,
          totalOrganizers: analytics?.totalOrganizers || 0,
          totalProducts: analytics?.totalProducts || 0,
          monthlyGrowth: {
            revenue: analytics?.monthlyGrowth?.revenue || 0,
            events: analytics?.monthlyGrowth?.events || 0,
            organizers: analytics?.monthlyGrowth?.organizers || 0,
            products: analytics?.monthlyGrowth?.products || 0
          }
        };

        setDashboardState({
          analytics: safeAnalytics,
          recentEvents: Array.isArray(events) ? events.slice(0, 5) : [],
          sellers: Array.isArray(sellers) ? sellers : [],
          organizers: Array.isArray(organizers) ? organizers : [],
          monthlyEvents: Array.isArray(monthlyEvents) ? monthlyEvents : []
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
      title: 'Total Revenue',
      value: `$${dashboardState.analytics.totalRevenue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`,
      icon: <DollarSign className="h-4 w-4 text-yellow-500" />,
      description: 'From all events',
      trend: dashboardState.analytics.monthlyGrowth?.revenue ?? 0
    },
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
  ];

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
      
      // Fetch ticket types first
      const types = await fetchTicketTypes(eventId);
      
      // Then fetch ticket buyers from the API
      const response = await adminApi.getEventTicketBuyers(eventId);
      
      // Extract the tickets array from the nested response
      const tickets = response?.data?.tickets || [];
      
      console.log('Processing tickets with types:', types);
      
      // Transform the ticket data to match our expected format
      const buyers = tickets.map((ticket: any) => {
        const ticketTypeId = ticket.ticket_type_id?.toString();
        let ticketTypeName = 'General Admission';
        
        if (ticketTypeId) {
          // Try to find the ticket type name in our mapping
          ticketTypeName = types[ticketTypeId] || `Unknown (ID: ${ticketTypeId})`;
          
          // If we couldn't find the ticket type, log it for debugging
          if (!types[ticketTypeId]) {
            console.warn(`Ticket type ID ${ticketTypeId} not found in types mapping`);
          }
        } else {
          console.warn('Ticket has no ticket_type_id:', ticket);
        }
        
        return {
          id: ticket.id?.toString() || Math.random().toString(36).substr(2, 9),
          name: ticket.customer_name || 'Anonymous',
          email: ticket.customer_email || 'No email provided',
          ticketType: ticketTypeName,
          ticketTypeId: ticketTypeId || 'general',
          ticketStatus: ticket.status || 'Valid',
          isScanned: ticket.is_scanned || false,
          quantity: parseInt(ticket.quantity) || 1,
          purchaseDate: new Date(ticket.purchase_date || new Date()).toISOString()
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
                  <Spinner className="h-8 w-8" />
                  <span className="ml-2">Loading ticket buyers...</span>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-400">
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
              <Store className="w-4 h-4 mr-2" />
              Sellers
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Events Chart */}
            <Card className="bg-gray-800 border-gray-700 p-6">
              <CardHeader>
                <CardTitle className="text-white">Monthly Event Counts</CardTitle>
                <CardDescription className="text-gray-300">Monthly event counts performance</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <div className="mt-4 h-[300px]">
                  {eventsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={eventsData}
                        margin={{
                          top: 5,
                          right: 10,
                          left: 10,
                          bottom: 5,
                        }}
                      >
                        <Tooltip content={<EventsTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#888888"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#888888"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Bar 
                          dataKey="count" 
                          name="Events" 
                          fill="#3B82F6" 
                          radius={[4, 4, 0, 0]}
                          barSize={32}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center">
                      <p className="text-muted-foreground">No event data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Events */}
            <Card className="bg-gray-800 border-gray-700 p-6">
              <CardHeader>
                <CardTitle className="text-white">Recent Events</CardTitle>
                <CardDescription className="text-gray-300">Latest events created in the system</CardDescription>
              </CardHeader>
              <CardContent>
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
              <CardFooter className="border-t border-gray-700 pt-4">
                <Button 
                  variant="ghost" 
                  className="text-yellow-400 hover:bg-yellow-500 hover:bg-opacity-10"
                >
                  View all events
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Events Overview</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>Last 12 months</span>
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
                  <div>Showing {dashboardState.recentEvents?.length || 0} of {dashboardState.recentEvents?.length || 0} events</div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" disabled={true} className="text-gray-400 hover:bg-gray-700">
                      Previous
                    </Button>
                    <Button variant="ghost" size="sm" className="bg-gray-700 text-white">
                      1
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:bg-gray-700">
                      Next
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Organizers Tab */}
          <TabsContent value="organizers" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div>
                  <CardTitle className="text-white">Organizers</CardTitle>
                  <CardDescription className="text-gray-300">
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
                  Showing {dashboardState.organizers?.length || 0} organizers
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Sellers Tab */}
          <TabsContent value="sellers" className="space-y-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div>
                  <CardTitle className="text-white">Sellers</CardTitle>
                  <CardDescription className="text-gray-300">
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="border-t border-gray-700 px-6 py-4">
                <div className="text-sm text-gray-400">
                  Showing {dashboardState.sellers?.length || 0} sellers
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

