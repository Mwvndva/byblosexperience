import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { 
  ArrowLeft, 
  Edit, 
  Share2, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Link as LinkIcon, 
  AlertTriangle, 
  Ticket,
  List,
  Plus,
  ShoppingCart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useOrganizerAuth } from '@/hooks/use-organizer-auth';
import { 
  format, 
  parseISO, 
  isAfter, 
  isBefore, 
  isToday, 
  differenceInMinutes, 
  differenceInHours,
  formatDistanceToNow 
} from 'date-fns';

interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  available: number;
  description: string;
  total_created?: number;
}

interface AnalyticsData {
  totalTicketsSold: number;
  totalScannedTickets: number;
  totalRevenue: number;
  ticketSales: { date: string; sales: number }[];
  referralSources: { source: string; count: number }[];
}

interface EventData {
  id: string;
  title: string;
  name?: string; // For backward compatibility
  description: string;
  startDate: string;
  start_date?: string; // For backward compatibility
  endDate: string;
  end_date?: string; // For backward compatibility
  location: string;
  venue: string;
  isOnline: boolean;
  onlineUrl?: string;
  online_url?: string; // For backward compatibility
  ticketTypes: TicketType[];
  ticket_types?: any[]; // Raw ticket types from API
  image_url?: string;
  status: string;
  createdAt: string;
  created_at?: string; // For backward compatibility
  updatedAt: string;
  updated_at?: string; // For backward compatibility
  analytics?: AnalyticsData;
  // New fields from the API
  total_tickets_sold?: number;
  total_revenue?: number;
  totalTicketsSold?: number;
  totalRevenue?: number;
}

// Fetch event data from API
const fetchEvent = async (id: string): Promise<EventData> => {
  try {
    console.log(`Fetching event with ID: ${id}`);
    const response = await api.get(`/organizers/events/${id}`);
    
    if (!response.data || !response.data.data || !response.data.data.event) {
      throw new Error('Invalid response format from server');
    }
    
    const event = response.data.data.event;
    console.log('Raw event data from API:', JSON.stringify(event, null, 2));
    
    // Debug: Log ticket types data
    if (event.ticket_types) {
      console.log('Ticket types data:', JSON.stringify(event.ticket_types, null, 2));
    }
    
    // Transform the API response to match our component's expected format
    const transformedEvent: EventData = {
      ...event,
      // Handle both camelCase and snake_case fields
      title: event.title || event.name || 'Untitled Event',
      description: event.description || '',
      startDate: event.start_date || event.startDate || new Date().toISOString(),
      endDate: event.end_date || event.endDate || new Date().toISOString(),
      location: event.location || '',
      venue: event.venue || '',
      isOnline: event.is_online || event.isOnline || false,
      onlineUrl: event.online_url || event.onlineUrl,
      status: event.status || 'draft',
      image_url: event.image_url,
      createdAt: event.created_at || event.createdAt || new Date().toISOString(),
      updatedAt: event.updated_at || event.updatedAt || new Date().toISOString(),
      // Map ticket types if they exist
      ticketTypes: (event.ticket_types || []).map((ticket: any) => {
        // Calculate available quantity based on total quantity minus sold
        const totalQuantity = parseInt(ticket.quantity || '0', 10);
        const sold = parseInt(ticket.quantity_sold || ticket.sold || '0', 10);
        const totalCreated = parseInt(ticket.total_created || ticket.sold || '0', 10);
        
        return {
          id: ticket.id?.toString() || Math.random().toString(36).substr(2, 9),
          name: ticket.name || 'General Admission',
          price: parseFloat(ticket.price || ticket.price_per_ticket || 0),
          quantity: totalQuantity,
          sold: sold,
          total_created: totalCreated,
          available: Math.max(0, totalQuantity - sold),
          description: ticket.description || '',
        };
      }),
      // Preserve raw data for debugging
      ticket_types: event.ticket_types,
      total_tickets_sold: event.total_tickets_sold,
      total_revenue: event.total_revenue,
      totalTicketsSold: event.total_tickets_sold || event.totalTicketsSold,
      totalRevenue: event.total_revenue || event.totalRevenue,
    };
    
    console.log('Transformed event data:', transformedEvent);
    return transformedEvent;
  } catch (error) {
    console.error('Error fetching event:', error);
    throw error;
  }
};

// Format date to a readable string
export function formatDate(dateInput: string | Date, format: 'full' | 'date' | 'time' = 'full'): string {
  try {
    // Handle different date input types
    let date: Date;
    
    // If it's already a Date object
    if (dateInput instanceof Date) {
      date = dateInput;
    } 
    // If it's a string that can be parsed by Date constructor
    else if (typeof dateInput === 'string') {
      // Try parsing the date string
      const parsedDate = new Date(dateInput);
      
      // If the date is invalid, try parsing with Date.parse
      if (isNaN(parsedDate.getTime())) {
        const timestamp = Date.parse(dateInput);
        if (!isNaN(timestamp)) {
          date = new Date(timestamp);
        } else {
          throw new Error(`Invalid date string: ${dateInput}`);
        }
      } else {
        date = parsedDate;
      }
    } else {
      throw new Error(`Invalid date format: ${typeof dateInput}`);
    }

    // Format based on requested format
    switch (format) {
      case 'date':
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      case 'time':
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });
      case 'full':
      default:
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
    }
  } catch (error) {
    console.error('Error formatting date:', error, 'Input:', dateInput);
    return 'Date not available';
  }
};

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  // Initialize with default values to prevent null errors
  const defaultEvent: EventData = {
    id: '',
    title: 'Loading...',
    description: '',
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    location: '',
    venue: '',
    isOnline: false,
    ticketTypes: [],
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    analytics: {
      ticketSales: [],
      referralSources: [],
      totalTicketsSold: 0,
      totalScannedTickets: 0,
      totalRevenue: 0
    }
  };
  
  const [event, setEvent] = useState<EventData>(defaultEvent);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const { toast } = useToast();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [shouldRefreshData, setShouldRefreshData] = useState(false);
  const { getToken } = useOrganizerAuth();
  const navigate = useNavigate();

  // Default analytics data
  const defaultAnalytics: AnalyticsData = {
    ticketSales: [],
    referralSources: [],
    totalTicketsSold: 0,
    totalScannedTickets: 0,
    totalRevenue: 0
  };

  // Calculate basic analytics from event data
  const calculateAnalytics = (eventData: EventData | null): AnalyticsData => {
    // Return default analytics if no event data
    if (!eventData) {
      return defaultAnalytics;
    }

    // If no ticket types, return analytics with zeros
    if (!eventData.ticketTypes || eventData.ticketTypes.length === 0) {
      return {
        ticketSales: eventData.analytics?.ticketSales || [],
        referralSources: eventData.analytics?.referralSources || [],
        totalTicketsSold: 0,
        totalScannedTickets: 0,
        totalRevenue: 0
      };
    }

    // Calculate total tickets sold and revenue from ticket types
    const totalTicketsSold = eventData.ticketTypes.reduce((sum, ticket) => sum + (ticket.sold || 0), 0);
    const totalRevenue = eventData.ticketTypes.reduce(
      (sum, ticket) => sum + (ticket.sold || 0) * (ticket.price || 0),
      0
    );



    return {
      ticketSales: eventData.analytics?.ticketSales || [],
      referralSources: eventData.analytics?.referralSources || [],
      totalTicketsSold: eventData.total_tickets_sold || eventData.totalTicketsSold || totalTicketsSold,
      totalScannedTickets: eventData.analytics?.totalScannedTickets || 0,
      totalRevenue: eventData.total_revenue || eventData.totalRevenue || totalRevenue,
    };
  };

  // Calculate analytics whenever event data or tickets change
  const analytics = useMemo(() => {
    const calculated = calculateAnalytics(event || null);
    // Update scanned tickets count from tickets data
    if (tickets && tickets.length > 0) {
      const scannedTickets = tickets.filter(ticket => ticket.scanned).length;
      calculated.totalScannedTickets = scannedTickets;
    }
    console.log('Calculating analytics:', calculated);
    return calculated;
  }, [event, tickets]);

  // Fetch tickets for the event
  const fetchTickets = useCallback(async () => {
    if (!id) return;
    
    try {
      setTicketsLoading(true);
      setTicketsError(null);
      const response = await api.get(`/organizers/tickets/events/${id}`);
      console.log('Tickets API Response:', response.data);
      const ticketsData = response.data.data?.tickets || [];
      setTickets(ticketsData);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTicketsError('Failed to load tickets. Please try again later.');
      toast({
        title: 'Error',
        description: 'Failed to load tickets. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setTicketsLoading(false);
    }
  }, [id, toast]);

  // Handle refresh button click
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      const eventData = await fetchEvent(id!);
      const processedEvent = {
        ...eventData,
        ticketTypes: Array.isArray(eventData.ticketTypes) ? eventData.ticketTypes : []
      };
      
      setEvent(processedEvent);
      setLastUpdated(new Date());
      
      // Refresh tickets if needed
      if (processedEvent.ticketTypes?.some(t => t.sold > 0)) {
        await fetchTickets();
      }
      
      return processedEvent;
    } catch (error) {
      console.error('Error refreshing event:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh event data.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [id, isRefreshing, fetchTickets, toast]);

  // Function to load event data
  const loadEvent = useCallback(async () => {
    if (!id) return null;
    
    try {
      setIsLoading(true);
      const eventData = await fetchEvent(id);
      const processedEvent = {
        ...eventData,
        ticketTypes: Array.isArray(eventData.ticketTypes) ? eventData.ticketTypes : []
      };
      
      setEvent(processedEvent);
      setLastUpdated(new Date());
      
      // Fetch tickets after event data is loaded
      if (processedEvent.ticketTypes?.some(t => t.sold > 0)) {
        await fetchTickets();
      }
      
      return processedEvent;
    } catch (error) {
      console.error('Error loading event:', error);
      toast({
        title: 'Error',
        description: 'Failed to load event. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [id, fetchTickets, toast]);

  // Initial data load
  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  // Set up polling for data refresh
  useEffect(() => {
    // Only poll if we're on analytics or tickets tab
    const shouldPoll = activeTab === 'analytics' || activeTab === 'tickets';
    
    if (shouldPoll) {
      let isMounted = true;
      
      const refreshData = async () => {
        if (!isMounted) return;
        
        try {
          const eventData = await fetchEvent(id!);
          if (eventData && isMounted) {
            console.log('Refreshed event data:', eventData);
            // Analytics will be automatically updated via the useMemo hook
            console.log('Refreshed event data, analytics will update automatically');
            
            // Force update the UI with the latest data
            setEvent(prev => ({
              ...prev,
              ...eventData,
              ticketTypes: eventData.ticketTypes || []
            }));
          }
        } catch (error) {
          console.error('Error during refresh:', error);
        }
      };
      
      // Initial refresh
      refreshData();
      
      // Set up polling
      const interval = setInterval(refreshData, 30000); // Poll every 30 seconds

      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Generate a clean URL for the event
  const getEventUrl = (event: EventData, type: 'view' | 'purchase' = 'view') => {
    if (!event) return '';
    
    const baseUrl = window.location.origin;
    const eventId = event.id;
    
    if (type === 'purchase') {
      // Use the full URL with the event ID for the purchase page
      return `${baseUrl}/e/${eventId}/purchase`;
    }
    // For view URLs, use just the event ID
    return `${baseUrl}/e/${eventId}`;
  };

  const safeEvent = event || defaultEvent;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/organizer/events">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to events</span>
            </Link>
          </Button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold tracking-tight">{safeEvent.title}</h1>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8"
              >
                {isRefreshing ? (
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                    <path d="M3 3v5h5"/>
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                    <path d="M16 16h5v5"/>
                  </svg>
                )}
              </Button>
              {lastUpdated && (
                <span className="text-sm text-muted-foreground">
                  Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>Created on {formatDate(safeEvent.createdAt)}</span>
              <span>•</span>
              <span>
                {safeEvent.status === 'published' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Published
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    Draft
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
        {/* Edit button removed as requested */}
      </div>

      <Tabs 
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {safeEvent.image_url && (
                  <img 
                    src={safeEvent.image_url} 
                    alt={safeEvent.title} 
                    className="rounded-lg w-full h-48 object-cover"
                  />
                )}
                <div className="space-y-2">
                  <h3 className="font-medium">Description</h3>
                  <p className="text-sm text-muted-foreground">
                    {safeEvent.description || 'No description provided.'}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h3 className="font-medium">Date & Time</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(safeEvent.startDate, 'full')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium">Location</h3>
                    <p className="text-sm text-muted-foreground">
                      {safeEvent.venue}
                      {safeEvent.location && `, ${safeEvent.location}`}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Event Analytics</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <>
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                      Refreshing...
                    </>
                  ) : 'Refresh Data'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalTicketsSold.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total tickets sold</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Scanned Tickets</CardTitle>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      className="h-4 w-4 text-muted-foreground"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <path d="m9 11 3 3L22 4" />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalScannedTickets.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Scanned tickets</p>
                    {analytics.totalTicketsSold > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ({Math.round((analytics.totalScannedTickets / analytics.totalTicketsSold) * 100)}% of total)
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${analytics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">Total revenue generated</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Tickets</CardTitle>
                <Button size="sm" asChild>
                  <Link to={`/organizer/events/${id}/tickets/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Ticket Type
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="types" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="types">Ticket Types</TabsTrigger>
                  <TabsTrigger value="list">Ticket List</TabsTrigger>
                </TabsList>

                <TabsContent value="types" className="mt-4">
                  {safeEvent.ticketTypes.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ticket Type</TableHead>
                          <TableHead className="text-right">Total Tickets</TableHead>
                          <TableHead className="text-right">Tickets Sold</TableHead>
                          <TableHead className="text-right">Amount Generated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {safeEvent.ticketTypes.map((ticket) => (
                          <TableRow key={ticket.id}>
                            <TableCell className="font-medium">
                              <div className="font-medium">{ticket.name}</div>
                              {ticket.description && (
                                <div className="text-xs text-muted-foreground">{ticket.description}</div>
                              )}
                              <div className="text-xs text-muted-foreground mt-1">
                                KSh {ticket.price.toLocaleString('en-KE', {minimumFractionDigits: 2})} each
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-medium">
                                {ticket.quantity || 0}
                              </div>
                              {ticket.total_created !== undefined && ticket.total_created !== ticket.quantity && (
                                <div className="text-xs text-muted-foreground">
                                  ({ticket.total_created} created)
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-medium">
                                {ticket.sold || 0}
                                {ticket.quantity > 0 && (
                                  <span className="text-xs text-muted-foreground block">
                                    ({(ticket.sold / ticket.quantity * 100).toFixed(1)}% sold)
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-medium">
                                KSh {((ticket.sold || 0) * (ticket.price || 0)).toLocaleString('en-KE', {minimumFractionDigits: 2})}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Ticket className="h-12 w-12 mx-auto mb-2 text-muted-foreground/20" />
                      <p>No ticket types available.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="list" className="mt-4">
                  {ticketsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    </div>
                  ) : ticketsError ? (
                    <div className="text-center py-8 text-destructive">
                      <p>{ticketsError}</p>
                      <Button variant="outline" className="mt-4" onClick={fetchTickets}>
                        Retry
                      </Button>
                    </div>
                  ) : tickets.length > 0 ? (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ticket #</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Scanned</TableHead>
                            <TableHead>Purchased</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tickets.map((ticket) => (
                            <TableRow key={ticket.id}>
                              <TableCell className="font-medium">
                                {ticket.ticket_number || `TKT-${ticket.id?.toString().padStart(6, '0')}`}
                              </TableCell>
                              <TableCell>
                                {ticket.ticket_type_name || ticket.ticket_type || 'General'}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span>{ticket.customer_name || 'Guest'}</span>
                                  {ticket.customer_email && (
                                    <span className="text-xs text-muted-foreground">
                                      {ticket.customer_email}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>KSh {ticket.price?.toLocaleString('en-KE', {minimumFractionDigits: 2}) || '0.00'}</TableCell>
                              <TableCell>
                                <span 
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    ticket.status === 'paid' ? 'bg-green-100 text-green-800' :
                                    ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    ticket.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {ticket.status ? ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1) : 'Unknown'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  <div 
                                    className={`h-2.5 w-2.5 rounded-full mr-2 ${
                                      ticket.scanned ? 'bg-green-500' : 'bg-gray-300'
                                    }`} 
                                  />
                                  {ticket.scanned ? 'Scanned' : 'Not Scanned'}
                                </div>
                              </TableCell>
                              <TableCell>
                                {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                }) : 'N/A'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Ticket className="h-12 w-12 mx-auto mb-2 text-muted-foreground/20" />
                      <p>No tickets found for this event.</p>
                      <Button variant="outline" className="mt-2" onClick={fetchTickets}>
                        Refresh
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Settings</CardTitle>
              <CardDescription>
                Manage your event settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {/* Direct Purchase Link */}
                <div className="space-y-2">
                  <Label>Direct Purchase Link</Label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 flex items-center px-3 py-2 border rounded-md bg-muted/50">
                      <ShoppingCart className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                      <a 
                        href={getEventUrl(safeEvent, 'purchase')} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline truncate"
                      >
                        {getEventUrl(safeEvent, 'purchase')}
                      </a>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(getEventUrl(safeEvent, 'purchase'));
                        toast({
                          title: 'Link copied',
                          description: 'Purchase link has been copied to your clipboard.',
                        });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Share this link to take people directly to ticket purchase
                  </p>
                </div>


              </div>

              <div className="pt-4 border-t">
                <div className="space-y-2">
                  <Label className="text-destructive">Danger Zone</Label>
                  <div className="p-4 border border-destructive/20 rounded-md bg-destructive/5">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium text-destructive">Delete this event</h4>
                        <p className="text-sm text-muted-foreground">
                          Once you delete an event, there is no going back. Please be certain.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
                            try {
                              await api.delete(`/organizers/events/${id}`);
                              toast({
                                title: 'Event deleted',
                                description: 'The event has been deleted successfully.',
                              });
                              navigate('/organizer/events');
                            } catch (error) {
                              console.error('Error deleting event:', error);
                              toast({
                                title: 'Error',
                                description: 'Failed to delete event. Please try again.',
                                variant: 'destructive',
                              });
                            }
                          }
                        }}
                      >
                        Delete Event
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
