import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, Loader2, RefreshCw, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { format, parseISO, isAfter, isBefore, isToday, differenceInMinutes, differenceInHours } from 'date-fns';
import api from '@/lib/api';

type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed' | 'upcoming' | 'past';

interface Event {
  id: number;
  name: string;
  status: EventStatus;
  start_date: string;
  end_date: string;
  ticket_quantity: number;
  ticket_price: number;
  tickets_sold: number;
  revenue?: number;
  location: string;
  description?: string;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

interface EventsResponse {
  data: {
    events: Event[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      total_pages: number;
    };
  };
}

const POLLING_INTERVAL = 30000; // 30 seconds

export default function EventsListPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      const response = await api.get(`/organizers/events?${params}`);
      
      // Handle different possible response structures
      const eventsData = response.data?.data?.events || response.data?.data || [];
      const paginationData = response.data?.data?.pagination || {
        total: eventsData.length,
        page: pagination.page,
        limit: pagination.limit,
        total_pages: Math.ceil(eventsData.length / pagination.limit)
      };
      
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setFilteredEvents(Array.isArray(eventsData) ? eventsData : []);
      setPagination(prev => ({
        ...prev,
        total: paginationData.total || 0,
        totalPages: paginationData.total_pages || 1
      }));
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events. Please try again later.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [pagination.page, pagination.limit]);

  // Initial fetch and setup polling
  useEffect(() => {
    fetchEvents();
    
    const intervalId = setInterval(() => {
      fetchEvents();
    }, POLLING_INTERVAL);
    
    return () => clearInterval(intervalId);
  }, [fetchEvents]);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchEvents();
  };

  const handleDeleteEvent = async (eventId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }
    
    try {
      await api.delete(`/organizers/events/${eventId}`);
      toast.success('Event deleted successfully');
      fetchEvents(); // Refresh the events list
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event. Please try again.');
    }
  };
  
  const getEventStatus = (event: Event): EventStatus => {
    if (event.status === 'cancelled' || event.status === 'completed') {
      return event.status;
    }
    
    const now = new Date();
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    
    if (isAfter(now, endDate)) return 'completed';
    if (isBefore(now, startDate)) return 'upcoming';
    return 'published';
  };
  
  const formatEventDuration = (start: Date, end: Date) => {
    const minutes = differenceInMinutes(end, start);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0 && remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  };

  const getStatusBadgeVariant = (status: EventStatus) => {
    switch (status) {
      case 'published':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'completed':
        return 'outline';
      case 'upcoming':
        return 'default';
      default:
        return 'default';
    }
  };

  if (isLoading && !isRefreshing) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading events...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground">
              Last updated: {format(lastUpdated, 'MMM d, yyyy h:mm a')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-white text-black border-gray-300 hover:bg-white hover:text-black hover:border-gray-400"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button asChild>
            <Link to="/organizer/events/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 mb-6 md:grid-cols-4">
        <div className="md:col-span-2">

        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Tickets</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => {
                const status = getEventStatus(event);
                const startDate = parseISO(event.start_date);
                const endDate = parseISO(event.end_date);
                const isTodayEvent = isToday(startDate);
                
                return (
                  <TableRow 
                    key={event.id} 
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/organizer/events/${event.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {event.image_url ? (
                          <img 
                            src={event.image_url} 
                            alt={event.name}
                            className="h-10 w-10 rounded-md object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{event.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(startDate, 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm">
                            {isTodayEvent ? 'Today' : format(startDate, 'EEEE')}, {format(startDate, 'h:mm a')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatEventDuration(startDate, endDate)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(status)} className="capitalize">
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col">
                        <span>{event.tickets_sold} / {event.ticket_quantity}</span>
                        <div className="w-full bg-secondary rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-primary h-1.5 rounded-full" 
                            style={{ 
                              width: `${Math.min(100, (event.tickets_sold / event.ticket_quantity) * 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {event.ticket_price > 0 ? (
                        <span>KSh {Number(event.ticket_price).toLocaleString('en-KE')}</span>
                      ) : (
                        <span className="text-muted-foreground">Free</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/organizer/events/${event.id}/edit`} className="w-full">
                              Edit Event
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600"
                            onClick={(e) => handleDeleteEvent(event.id, e)}
                          >
                            Delete Event
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <CalendarIcon className="h-10 w-10 text-muted-foreground/40" />
                    <h3 className="text-lg font-medium">No events found</h3>
                    <p className="text-sm text-muted-foreground">
                      Showing {pagination.total} events
                    </p>
                    {pagination.total === 0 && (
                      <Button className="mt-4" asChild>
                        <Link to="/organizer/events/new">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Event
                        </Link>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{filteredEvents.length}</span> of{' '}
            <span className="font-medium">{pagination.total}</span> events
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
