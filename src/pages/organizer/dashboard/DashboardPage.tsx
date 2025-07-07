import { useState, useEffect, useCallback } from 'react';
import { Calendar, Ticket, DollarSign, Clock, Users, TrendingUp, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import { useOrganizerAuth } from '@/contexts/OrganizerAuthContext';
import { AlertCircle } from 'lucide-react';
import api from '@/lib/api';

// Type definitions
interface DashboardStats {
  id: number;
  total_events: number;
  upcoming_events: number;
  past_events: number;
  current_events: number;
  total_tickets_sold: number;
  total_revenue: string;
  updated_at: string;
}

interface RecentEvent {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  ticket_price: number;
  image_url?: string;
}

interface RecentSale {
  id: number;
  transaction_id: string;
  customer_name: string;
  event_title: string;
  event_date: string;
  ticket_type: string;
  quantity: number;
  amount: number;
  created_at: string;
}

// Format currency (using shared utility function from @/lib/utils)

// Format date
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Stats card component
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  iconColor, 
  change, 
  changeType, 
  description 
}: StatCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className={`p-2 rounded-md ${iconColor}`}>
        <Icon className="h-4 w-4" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {change && (
        <p className="text-xs text-muted-foreground flex items-center">
          {changeType === 'up' ? (
            <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
          ) : (
            <TrendingUp className="h-3 w-3 text-red-500 rotate-180 mr-1" />
          )}
          {change} {description}
        </p>
      )}
    </CardContent>
  </Card>
);

// Type for the stat card component props
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  change: string | null;
  changeType: 'up' | 'down' | null;
  description: string;
}

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const { toast } = useToast();
  const { getToken } = useOrganizerAuth();

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // First, fetch the dashboard data which includes both stats and recent events
      const dashboardRes = await api.get('/organizers/dashboard');
      console.log('Dashboard Response:', dashboardRes.data);

      // Extract events from the dashboard response if available
      const events = Array.isArray(dashboardRes.data.data?.recentEvents) ? 
        dashboardRes.data.data.recentEvents : [];
        
      console.log('Setting recent events:', events);
      
      // Set the stats from the dashboard response
      setStats(dashboardRes.data.data?.stats || {
        total_events: 0,
        upcoming_events: 0,
        past_events: 0,
        current_events: 0,
        total_tickets_sold: 0,
        total_revenue: '0',
        updated_at: new Date().toISOString()
      });
      
      setRecentEvents(events);
      
      // Set recent sales if available, otherwise empty array
      setRecentSales(dashboardRes.data.data?.recentSales || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Initial data load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Get event status
  const getEventStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (now < start) return { status: 'Upcoming', color: 'bg-blue-100 text-blue-800' };
    if (now >= start && now <= end) return { status: 'In Progress', color: 'bg-green-100 text-green-800' };
    return { status: 'Completed', color: 'bg-gray-100 text-gray-800' };
  };

  // Stats data for the cards
  const statsData = [
    {
      id: 1,
      title: 'Total Events',
      value: stats?.total_events || 0,
      icon: Calendar,
      iconColor: 'bg-indigo-100 text-indigo-600',
      change: null,
      changeType: null,
      description: 'all time'
    },
    {
      id: 2,
      title: 'Upcoming Events',
      value: stats?.upcoming_events || 0,
      icon: Calendar,
      iconColor: 'bg-blue-100 text-blue-600',
      change: null,
      changeType: null,
      description: 'scheduled'
    },
    {
      id: 3,
      title: 'Current Events',
      value: stats?.current_events || 0,
      icon: Clock,
      iconColor: 'bg-amber-100 text-amber-600',
      change: null,
      changeType: null,
      description: 'happening now'
    },
    {
      id: 4,
      title: 'Past Events',
      value: stats?.past_events || 0,
      icon: Calendar,
      iconColor: 'bg-gray-100 text-gray-600',
      change: null,
      changeType: null,
      description: 'completed'
    },
    {
      id: 5,
      title: 'Tickets Sold',
      value: stats?.total_tickets_sold || 0,
      icon: Ticket,
      iconColor: 'bg-green-100 text-green-600',
      change: null,
      changeType: null,
      description: 'all time'
    },
    {
      id: 6,
      title: 'Total Revenue',
      value: stats?.total_revenue ? formatCurrency(Number(stats.total_revenue)) : formatCurrency(0),
      icon: DollarSign,
      iconColor: 'bg-emerald-100 text-emerald-600',
      change: null,
      changeType: null,
      description: 'all time'
    },
    // Attendees counter removed as requested
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-4">Recent Sales</h2>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-md bg-red-50 px-2 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center space-x-4">
            <Link 
              to="/" 
              className="inline-flex items-center px-3 py-2 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Home
            </Link>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organizer Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">
              {stats?.updated_at ? `Last updated ${new Date(stats.updated_at).toLocaleString()}` : 'Loading...'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/organizer/events"
            className="inline-flex items-center px-4 py-2 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
          >
            <Calendar className="h-4 w-4 mr-2" />
            View All Events
          </Link>
          <Link
            to="/organizer/events/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            New Event
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {statsData.map((stat) => (
          <StatCard
            key={stat.id}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            iconColor={stat.iconColor}
            change={stat.change}
            changeType={stat.changeType}
            description={stat.description}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming Events */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Upcoming Events</h2>
            <Link 
              to="/organizer/events" 
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors duration-200"
            >
              View all
            </Link>
          </div>
          
          {recentEvents.length > 0 ? (
            <div className="space-y-4">
              {recentEvents.map((event) => {
                const status = getEventStatus(event.start_date, event.end_date);
                return (
                  <Link 
                    key={event.id} 
                    to={`/organizer/events/${event.id}`}
                    className="block group"
                  >
                    <Card className="overflow-hidden transition-all duration-200 hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5">
                      <div className="p-4">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0 h-16 w-16 rounded-lg bg-gray-100 overflow-hidden">
                            {event.image_url ? (
                              <img 
                                src={event.image_url} 
                                alt={event.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center">
                                <Calendar className="h-6 w-6 text-indigo-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors duration-200">
                              {event.name}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {formatDate(event.start_date)}
                            </p>
                            {event.location && (
                              <div className="flex items-center mt-1 text-sm text-gray-500">
                                <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-0.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                              {status.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="text-base font-medium text-gray-900">No upcoming events</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-xs mx-auto">
                  You don't have any upcoming events. Create your first event to get started.
                </p>
                <div className="mt-6">
                  <Link
                    to="/organizer/events/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    New Event
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Sales */}
        <div className="space-y-4">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-900">Recent Sales</h2>
          </div>
          
          {recentSales.length > 0 ? (
            <div className="space-y-4">
              {recentSales.map((sale) => (
                <Card key={sale.id} className="overflow-hidden hover:shadow-md transition-shadow duration-200">
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {sale.customer_name || 'Guest'}
                          </h3>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {sale.quantity} × {sale.ticket_type}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {sale.event_title}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(sale.amount)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(sale.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="mx-auto h-16 w-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
                  <Ticket className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-base font-medium text-gray-900">No recent sales</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-xs mx-auto">
                  Your recent ticket sales will appear here when customers make purchases.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
