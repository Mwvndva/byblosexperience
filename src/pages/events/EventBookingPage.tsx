import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Calendar, MapPin, Clock, ArrowLeft, Loader2, XCircle, RefreshCw, Ticket, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getPublicEvent, getEventTicketTypes, purchaseTicketsWithPaystack } from '@/api/eventApi';
import { TicketPurchaseForm } from '@/components/events/TicketPurchaseForm';
import type { TicketType as BaseTicketType } from '@/types/event';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

interface EventTicketType extends Omit<BaseTicketType, 'max_per_order'> {
  max_per_order?: number;
  min_per_order?: number;
  sold?: number;
  available?: number;
  is_sold_out?: boolean;
}

interface Event {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  image_url: string | null;
  ticket_price: number;
  ticket_quantity: number;
  available_tickets?: number;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
  ticket_types?: EventTicketType[];
  ticketTypes?: EventTicketType[]; // For backward compatibility
}

interface BookingFormData {
  name: string;
  email: string;
  phone: string;
  ticketCount: number;
}

interface PurchaseResponse {
  success: boolean;
  message: string;
  reference?: string;
}

interface EventBookingPageProps {
  eventId?: string;
}

export default function EventBookingPage({ eventId: propEventId }: EventBookingPageProps = {}) {
  const params = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Use propEventId if provided, otherwise fall back to URL params
  const eventId = propEventId || params.eventId;
  
  if (!eventId) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
        <p className="mb-4">The event you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate('/events')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Events
        </Button>
      </div>
    );
  }
  
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<{
    eventName: string;
    bookingReference: string;
    customerEmail: string;
  } | null>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketTypes, setTicketTypes] = useState<EventTicketType[]>([]);
  const [loadingTicketTypes, setLoadingTicketTypes] = useState(false);
  
  // Calculate total price with 2 decimal places


  // Format event date and time
  const formatEventDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'EEEE, MMMM d, yyyy');
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Date not available';
    }
  };

  const formatEventTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'h:mm a');
    } catch (e) {
      console.error('Error formatting time:', e);
      return 'Time not available';
    }
  };

  // Fetch event data
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch event data
        const eventData = await getPublicEvent(eventId);
        
        // If the event is not published, don't show it
        if (eventData.status !== 'published') {
          throw new Error('This event is not available for booking');
        }
        
        // Fetch ticket types for this event
        try {
          const types = await getEventTicketTypes(eventData.id);
          
          // Process the ticket types to ensure they have all required fields
          const processedTypes = types.map(type => ({
            ...type,
            event_id: type.event_id || eventData.id,
            quantity_available: type.quantity_available ?? (type.quantity - (type.sold || 0)),
            price: Number(type.price) || 0,
            quantity: type.quantity || 0,
            sold: type.sold || 0,
            created_at: type.created_at || new Date().toISOString(),
            updated_at: type.updated_at || new Date().toISOString()
          }));
          
          // Filter out any ticket types that are sold out or have no quantity
          const availableTypes = processedTypes.filter(
            type => type.quantity_available > 0 && type.quantity > 0
          );
          
          // Update event with its ticket types
          setEvent({
            ...eventData,
            ticket_types: availableTypes,
            ticketTypes: availableTypes
          });
          
        } catch (ticketError) {
          console.error('Error fetching ticket types:', ticketError);
          // Still set the event even if ticket types fail to load
          setEvent(eventData);
          toast({
            title: 'Warning',
            description: 'Event loaded, but there was an issue loading ticket types. Please try again later.',
            variant: 'default'
          });
        }
        
      } catch (err: any) {
        console.error('Error fetching event:', err);
        const errorMessage = err.message || 'Failed to load event details';
        setError(errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchEvent();
  }, [eventId, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-md overflow-hidden p-8">
            <div className="flex flex-col items-center text-center">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Event Not Found</h2>
              <p className="text-gray-600 mb-6">The event you're looking for doesn't exist or has been removed.</p>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Try Again
                </Button>
                <Button onClick={() => navigate('/')}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Calculate available tickets
  const calculateAvailableTickets = () => {
    // If we have ticket types, sum their available quantities
    if (event.ticket_types?.length) {
      return event.ticket_types.reduce((sum, type) => {
        const available = type.quantity_available ?? (type.quantity - (type.sold || 0));
        return sum + Math.max(0, available);
      }, 0);
    }
    // Fall back to event-level availability
    return event.available_tickets ?? event.ticket_quantity;
  };
  
  const availableTickets = calculateAvailableTickets();

  // Get event image URL or fallback to a default image
  const getEventImage = (event: Event) => {
    return event.image_url || 'https://images.unsplash.com/photo-1505373876331-ff89baa8f5f8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80';
  };

  // Handle ticket purchase
  const handleBuyTicket = async () => {
    if (!event) return;
    
    // Check if the event is sold out before proceeding
    const availableTickets = calculateAvailableTickets();
    if (availableTickets <= 0) {
      // Don't proceed further if event is sold out
      return;
    }
    
    try {
      setLoadingTicketTypes(true);
      
      // First, check if we have ticket types in the event data
      let types = event.ticket_types || event.ticketTypes;
      
      // If no ticket types in the event data, try to fetch them
      if (!types || types.length === 0) {
        try {
          types = await getEventTicketTypes(event.id);
          
          // Update the event with the fetched ticket types
          setEvent(prev => ({
            ...prev!,
            ticket_types: types,
            ticketTypes: types
          }));
        } catch (fetchError) {
          console.error('Error fetching ticket types:', fetchError);
          throw new Error('Failed to load ticket types. Please try again.');
        }
      }
      
      if (!types || types.length === 0) {
        throw new Error('No ticket types available for this event');
      }
      
      // Process the ticket types to ensure they have all required fields
      const currentDate = new Date();
      const processedTypes = types.map(type => ({
        ...type,
        event_id: type.event_id || event.id,
        quantity_available: type.quantity_available ?? (type.quantity - (type.sold || 0)),
        price: Number(type.price) || 0,
        quantity: type.quantity || 0,
        sold: type.sold || 0,
        min_per_order: type.min_per_order || 1,
        max_per_order: type.max_per_order || 10,
        sales_start_date: type.sales_start_date || event.start_date,
        sales_end_date: type.sales_end_date || event.end_date,
        is_active: type.is_active !== undefined ? type.is_active : true,
        created_at: type.created_at || new Date().toISOString(),
        updated_at: type.updated_at || new Date().toISOString(),
        // Additional calculated fields
        is_available: (type.quantity_available ?? (type.quantity - (type.sold || 0))) > 0 && 
                     type.is_active !== false &&
                     (!type.sales_start_date || new Date(type.sales_start_date) <= currentDate) &&
                     (!type.sales_end_date || new Date(type.sales_end_date) >= currentDate)
      }));
      
      // Filter out any ticket types that are not available
      const availableTypes = processedTypes.filter(type => type.is_available);
      
      // Check if we have any available tickets across all types
      const hasAvailableTickets = availableTypes.length > 0 && 
        availableTypes.some(type => (type.quantity_available ?? 1) > 0);
      
      if (!hasAvailableTickets) {
        // Check for specific reasons why tickets might not be available
        const now = currentDate.getTime();
        const hasInactiveTickets = processedTypes.some(t => !t.is_active);
        const hasFutureSales = processedTypes.some(t => 
          t.sales_start_date && new Date(t.sales_start_date).getTime() > now
        );
        const hasPastSales = processedTypes.some(t => 
          t.sales_end_date && new Date(t.sales_end_date).getTime() < now
        );
        
        let errorMessage = 'No tickets are currently available for purchase';
        
        if (hasInactiveTickets) {
          errorMessage = 'All ticket types are currently inactive';
        } else if (processedTypes.every(t => (t.quantity_available ?? 0) <= 0)) {
          errorMessage = 'This event is sold out';
        } else if (hasFutureSales) {
          errorMessage = 'Ticket sales have not started yet';
        } else if (hasPastSales) {
          errorMessage = 'Ticket sales have ended';
        }
        
        // Show toast with the error message
        toast({
          title: 'Tickets Unavailable',
          description: errorMessage,
          variant: 'destructive',
        });
        
        // Don't show the form if there are no tickets available
        setShowTicketForm(false);
        return;
      }
      
      // Sort by price (cheapest first)
      availableTypes.sort((a, b) => a.price - b.price);
      
      setTicketTypes(availableTypes);
      setShowTicketForm(true);
    } catch (error) {
      console.error('Error in handleBuyTicket:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load ticket information';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      setShowTicketForm(false);
    } finally {
      setLoadingTicketTypes(false);
    }
  };
  
  // Handle successful ticket purchase
  const handlePurchaseSuccess = () => {
    setShowSuccess(true);
    setShowTicketForm(false);
    
    // Refresh event data to update available tickets
    if (event) {
      getPublicEvent(event.id).then(updatedEvent => {
        setEvent(updatedEvent);
      }).catch(err => {
        console.error('Error refreshing event data:', err);
      });
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Button>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8">
          {/* Event Details */}
          <div>
            {event.image_url && (
              <div className="mb-6 overflow-hidden rounded-xl bg-gray-100">
                <img
                  src={event.image_url}
                  alt={event.name}
                  className="w-full h-64 object-cover"
                  onError={(e) => {
                    // If image fails to load, hide the image container
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const container = target.parentElement;
                    if (container) {
                      container.style.display = 'none';
                    }
                  }}
                />
              </div>
            )}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold">{event.name}</h2>
                    <p className="text-gray-600 mt-1">{event.description}</p>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>
                      {formatEventDate(event.start_date)} - {event.end_date ? formatEventDate(event.end_date) : ''}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Clock className="mr-2 h-4 w-4" />
                    <span>
                      {formatEventTime(event.start_date)} - {event.end_date ? formatEventTime(event.end_date) : ''}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="mr-2 h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ticket Purchase */}
          <div className="space-y-4">
            <Button 
              onClick={handleBuyTicket}
              className={`w-full ${availableTickets <= 0 ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' : ''}`}
              disabled={availableTickets <= 0 || loadingTicketTypes}
              variant={availableTickets <= 0 ? 'secondary' : 'default'}
            >
              {loadingTicketTypes ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Ticket className="mr-2 h-4 w-4" />
                  {availableTickets <= 0 ? 'Sold Out' : 'Buy Ticket'}
                </>
              )}
            </Button>
            
            {availableTickets <= 0 && (
              <div className="rounded-md bg-gray-50 p-4 border border-gray-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <XCircle className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-800">This event is sold out</h3>
                    <div className="mt-2 text-sm text-gray-600">
                      <p>All tickets for this event have been sold. Check back later for any last-minute availability.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Ticket Purchase Form */}
            <TicketPurchaseForm
              event={{
                id: event.id,
                name: event.name,
                ticketTypes: ticketTypes
              }}
              open={showTicketForm}
              onOpenChange={(open) => {
                setShowTicketForm(open);
                if (!open) {
                  // Reset loading state when closing the form
                  setLoadingTicketTypes(false);
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" aria-hidden="true" />
            </div>
            <DialogTitle className="text-center text-xl font-medium text-gray-900">
              Booking Confirmed!
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Thank you for booking <span className="font-medium">{bookingDetails?.eventName}</span>.
              A confirmation has been sent to <span className="font-medium">{bookingDetails?.customerEmail}</span>.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Booking reference: <span className="font-mono">{bookingDetails?.bookingReference}</span>
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                onClick={() => navigate('/events')}
              >
                Back to Events
              </button>
              <button
                type="button"
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                onClick={() => setShowSuccess(false)}
              >
                Close
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
