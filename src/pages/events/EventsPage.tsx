import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { Calendar, MapPin, Clock, Ticket, Home, ArrowRight, AlertCircle } from 'lucide-react';
import { getUpcomingEvents, getEventTicketTypes, purchaseTickets } from '@/api/eventApi';
import type { Event, TicketType } from '@/types/event';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { TicketPurchaseForm } from '@/components/events/TicketPurchaseForm';

interface EventsPageProps {
  eventId?: string;
  isEmbed?: boolean;
}

export default function EventsPage({ eventId, isEmbed = false }: EventsPageProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loadingTicketTypes, setLoadingTicketTypes] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setRefreshing(!showLoading);
      
      const data = await getUpcomingEvents(20); // Get up to 20 upcoming events
      
      // Debug log the raw API response
      console.log('Raw API response:', data);
      
      // The backend already filters for upcoming events, so we just need to ensure they're valid
      const validEvents = data.filter(event => {
        const isValid = event && event.start_date && event.end_date;
        if (isValid) {
          console.log(`Event ${event.id} (${event.name}):`, {
            available_tickets: event.available_tickets,
            tickets_sold: event.tickets_sold,
            ticket_quantity: event.ticket_quantity,
            calculatedAvailable: event.ticket_quantity - (event.tickets_sold || 0)
          });
        }
        return isValid;
      });
      
      setEvents(validEvents);
      setError(null);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load events. Please try again later.';
      console.error('Error fetching events:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    
    // Set up auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      fetchEvents(false);
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  // Format event date and time
  const formatEventDate = (dateString: string) => {
    return format(parseISO(dateString), 'PPP');
  };

  const formatEventTime = (dateString: string) => {
    return format(parseISO(dateString), 'h:mm a');
  };

  const isEventUpcoming = (event: Event) => {
    const now = new Date();
    return isAfter(parseISO(event.start_date), now);
  };

  const isEventHappeningNow = (event: Event) => {
    const now = new Date();
    return (
      isBefore(parseISO(event.start_date), now) && 
      isAfter(parseISO(event.end_date), now)
    );
  };

  // Calculate available tickets
  const getAvailableTickets = (event: Event) => {
    // If the event has ticket types, check if any are available
    if (event.ticket_types && event.ticket_types.length > 0) {
      const availableTickets = event.ticket_types.reduce((sum, type) => {
        const available = type.available !== undefined ? type.available : (type.quantity - (type.sold || 0));
        return sum + Math.max(0, available);
      }, 0);
      
      console.log(`Event ${event.id} (${event.name}) has ${availableTickets} tickets available across all types`);
      return availableTickets;
    }
    
    // Fall back to event-level ticket availability
    let available = 0;
    
    if (typeof event.available_tickets === 'number' && !isNaN(event.available_tickets)) {
      available = event.available_tickets;
    } else if (typeof event.tickets_sold === 'number' && typeof event.ticket_quantity === 'number') {
      available = event.ticket_quantity - event.tickets_sold;
    } else if (typeof event.ticket_quantity === 'number') {
      available = event.ticket_quantity;
    }
    
    // Ensure we don't return negative numbers
    return Math.max(0, available);
  };

  // Get event image URL or fallback to a default image
  const getEventImage = (event: Event) => {
    return event.image_url || 'https://images.unsplash.com/photo-1505373876331-ff89baa8f5f8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80';
  };

  const handleBuyTicket = async (event: Event) => {
    console.log('handleBuyTicket called for event:', event.id);
    try {
      console.log('Setting selected event and showing loading state');
      setSelectedEvent(event);
      setLoadingTicketTypes(true);
      
      // First check if the event is sold out using available_tickets
      const availableTickets = event.available_tickets ?? event.ticket_quantity;
      if (availableTickets <= 0) {
        throw new Error('This event is sold out');
      }
      
      console.log('Fetching ticket types...');
      const types = await getEventTicketTypes(event.id);
      console.log('Received ticket types:', types);
      
      // Check if we have valid ticket types with available quantities
      const hasAvailableTickets = types.length === 0 || types.some(type => 
        type.quantity_available > 0 || type.quantity_available === undefined
      );
      
      if (!hasAvailableTickets) {
        throw new Error('No tickets available for this event');
      }
      
      // Set the ticket types and show the form
      console.log('Setting ticket types in state');
      setTicketTypes(types);
      setShowTicketForm(true);
      
      console.log('Ticket form is now visible with types');
    } catch (error) {
      console.error('Error in handleBuyTicket:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load ticket information';
      
      toast({
        title: 'Tickets Unavailable',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Always hide the form on error
      setShowTicketForm(false);
    } finally {
      console.log('Setting loading to false');
      setLoadingTicketTypes(false);
    }
  };

  interface PurchaseFormData {
    customerName: string;
    customerEmail: string;
    phoneNumber: string;
    ticketTypeId?: string | number;
    quantity: number;
    eventId?: number;
  }

  const handleTicketPurchase = async (data: PurchaseFormData) => {
    if (!selectedEvent) {
      throw new Error('No event selected');
    }
    
    try {
      console.log('Starting ticket purchase with data:', data);
      
      // Trim all string fields and ensure proper types
      const trimmedData = {
        ...data,
        customerName: data.customerName?.trim() || '',
        customerEmail: data.customerEmail?.trim().toLowerCase() || '',
        phoneNumber: data.phoneNumber?.replace(/\s+/g, '') || '', // Remove all whitespace from phone
        quantity: Number(data.quantity) || 1,
        ticketTypeId: data.ticketTypeId ? Number(data.ticketTypeId) : null
      };
      
      console.log('Processed form data:', trimmedData);
      
      // Validate required fields
      const validationErrors: string[] = [];
      
      if (!trimmedData.customerName || trimmedData.customerName.length < 2) {
        validationErrors.push('Please enter a valid name (at least 2 characters)');
      } else if (trimmedData.customerName.length > 100) {
        validationErrors.push('Name cannot exceed 100 characters');
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!trimmedData.customerEmail) {
        validationErrors.push('Please enter your email address');
      } else if (!emailRegex.test(trimmedData.customerEmail)) {
        validationErrors.push('Please enter a valid email address');
      } else if (trimmedData.customerEmail.length > 255) {
        validationErrors.push('Email address cannot exceed 255 characters');
      }
      
      if (!trimmedData.phoneNumber) {
        validationErrors.push('Please enter your phone number');
      } else if (!/^\+?[0-9\s-]{8,20}$/.test(trimmedData.phoneNumber)) {
        validationErrors.push('Please enter a valid phone number (8-20 digits)');
      }
      
      if (isNaN(trimmedData.quantity) || trimmedData.quantity < 1) {
        validationErrors.push('Please enter a valid quantity');
      }
      
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('\n'));
      }

      // Check ticket availability before proceeding
      const availableTickets = selectedEvent.available_tickets ?? selectedEvent.ticket_quantity;
      const requestedQuantity = Number(data.quantity) || 1;
      
      if (availableTickets <= 0) {
        toast({
          title: 'Tickets Sold Out',
          description: 'Sorry, this event is completely sold out.',
          variant: 'destructive',
        });
        setShowTicketForm(false);
        return;
      }
      
      if (requestedQuantity > availableTickets) {
        toast({
          title: 'Not Enough Tickets',
          description: `Only ${availableTickets} ticket${availableTickets !== 1 ? 's' : ''} available.`,
          variant: 'destructive',
        });
        return;
      }

      // Prepare purchase data with proper types
      let ticketTypeId: number | undefined;
      
      if (trimmedData.ticketTypeId) {
        // If ticketTypeId is a string, convert it to a number
        ticketTypeId = typeof trimmedData.ticketTypeId === 'string' 
          ? parseInt(trimmedData.ticketTypeId, 10)
          : trimmedData.ticketTypeId;
      } else if (selectedEvent.ticketTypes?.[0]?.id) {
        // Fall back to first available ticket type if none selected
        ticketTypeId = selectedEvent.ticketTypes[0].id;
      }

      const purchaseData = {
        eventId: selectedEvent.id,
        quantity: requestedQuantity,
        customerName: trimmedData.customerName,
        customerEmail: trimmedData.customerEmail,
        phoneNumber: trimmedData.phoneNumber,
        ticketTypeId: ticketTypeId !== undefined ? ticketTypeId : undefined
      };
      
      console.log('Prepared purchase data:', purchaseData);
      
      // Call the API to process the ticket purchase
      const result = await purchaseTickets(purchaseData);
      
      // Show success message with transaction details
      toast({
        title: 'Purchase Successful!',
        description: `Your tickets for ${selectedEvent.name} have been booked. A confirmation has been sent to ${trimmedData.customerEmail}.`,
        variant: 'default',
        duration: 10000,
      });
      
      // Refresh events to update available tickets
      await fetchEvents(false);
      
      // Close the form
      setShowTicketForm(false);
      
    } catch (error) {
      console.error('Error purchasing tickets:', error);
      
      // Show user-friendly error message
      toast({
        title: 'Purchase Failed',
        description: error.message || 'Failed to process ticket purchase. Please try again.',
        variant: 'destructive',
      });
      
      // If the error is about ticket availability, close the form
      if (error.message?.toLowerCase().includes('ticket') && 
          (error.message.toLowerCase().includes('sold out') || 
           error.message.toLowerCase().includes('available'))) {
            setShowTicketForm(false);
      }
      
      throw error; // Re-throw for form handling if needed
    }
  };

  const handleViewEvent = (eventId: number) => {
    navigate(`/events/${eventId}`);
  };

  const handleRefresh = () => {
    fetchEvents();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Upcoming Events</h1>
            <p className="text-xl text-gray-600">Loading events...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-4 w-full" />
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Upcoming Events</h1>
            <p className="text-xl text-gray-600">Find and book tickets for amazing events</p>
          </div>

          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center p-4 bg-red-50 rounded-full mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load events</h3>
            <p className="text-gray-500 mb-6">{error}</p>
            <Button 
              onClick={handleRefresh}
              variant="outline"
              disabled={refreshing}
              className="inline-flex items-center"
            >
              {refreshing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                'Try Again'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Upcoming Events</h1>
            <p className="text-lg text-gray-600">Find and book tickets for amazing events</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Back to Home
            </Button>
            <Button 
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex-shrink-0"
            >
              {refreshing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Events
                </>
              )}
            </Button>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-100">
            <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-blue-50 mb-4">
              <Calendar className="h-12 w-12 text-blue-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Events</h3>
            <p className="text-gray-500 max-w-md mx-auto">There are no upcoming events at the moment. Please check back later for new events.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => {
              const isUpcoming = isEventUpcoming(event);
              const isHappeningNow = isEventHappeningNow(event);
              
              return (
                <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
                  <div className="relative">
                    <img 
                      src={event.image_url || 'https://images.unsplash.com/photo-1505373877841-8d25f96d3b4a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80'} 
                      alt={event.name}
                      className="w-full h-48 object-cover"
                    />
                    {(() => {
                      const availableTickets = getAvailableTickets(event);
                      console.log(`Rendering event ${event.id} (${event.name}):`, {
                        availableTickets,
                        isHappeningNow,
                        isUpcoming
                      });
                      
                      if (availableTickets <= 0) {
                        return (
                          <Badge className="absolute top-2 right-2 bg-red-500 hover:bg-red-600">
                            Sold Out
                          </Badge>
                        );
                      } else if (isHappeningNow) {
                        return (
                          <Badge className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600">
                            Happening Now
                          </Badge>
                        );
                      } else if (isUpcoming) {
                        return (
                          <Badge className="absolute top-2 right-2 bg-green-500 hover:bg-green-600">
                            Upcoming
                          </Badge>
                        );
                      } else {
                        return (
                          <Badge variant="destructive" className="absolute top-2 right-2">
                            Past Event
                          </Badge>
                        );
                      }
                    })()}
                  </div>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{event.name}</CardTitle>
                        <CardDescription className="mt-1">{event.location}</CardDescription>
                      </div>
                      <Badge variant="outline" className="text-sm">
                        {event.ticket_price && !isNaN(Number(event.ticket_price)) && Number(event.ticket_price) > 0 
                          ? `KSh ${Number(event.ticket_price).toLocaleString('en-US')}` 
                          : 'Free'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <Calendar className="h-5 w-5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">{formatEventDate(event.start_date)}</p>
                          <p className="text-sm text-gray-500">
                            {formatEventTime(event.start_date)} - {formatEventTime(event.end_date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <MapPin className="h-5 w-5 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{event.location}</p>
                      </div>
                      <div className="flex items-start">
                        <Ticket className={`h-5 w-5 mr-2 mt-0.5 flex-shrink-0 ${getAvailableTickets(event) > 0 ? 'text-green-500' : 'text-red-500'}`} />
                        <p className={`text-sm ${getAvailableTickets(event) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {getAvailableTickets(event) > 0 ? 'Tickets Available' : 'Sold Out'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="mt-auto">
                    {getAvailableTickets(event) > 0 ? (
                      <Button 
                        variant={isUpcoming || isHappeningNow ? 'default' : 'outline'} 
                        onClick={() => handleBuyTicket(event)}
                        className="w-full flex items-center justify-center"
                        disabled={!isUpcoming && !isHappeningNow}
                      >
                        {isHappeningNow ? 'Join Now' : 'Get Tickets'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full flex items-center justify-center bg-gray-100 text-gray-500 cursor-not-allowed"
                        disabled
                      >
                        Sold Out
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Ticket Purchase Form Modal */}
        {selectedEvent && (
          <TicketPurchaseForm
            event={{
              id: selectedEvent.id,
              name: selectedEvent.name,
              ticketTypes: ticketTypes
            }}
            open={showTicketForm}
            onOpenChange={setShowTicketForm}
          />
        )}
      </div>
    </div>
  );
}
