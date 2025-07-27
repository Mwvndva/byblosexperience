import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"
import adminApi from '@/api/adminApi';
import { format } from 'date-fns';
import { DataTable } from './components/DataTable';

// Define types for our data
type Seller = {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  createdAt: string;
};

type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
};

type Organizer = {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: 'Active' | 'Inactive' | 'Pending';
};

type Event = {
  id: number;
  title: string;
  name?: string; // For backward compatibility
  date: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  description?: string;
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled' | string; // Allow any string for flexibility
  attendees?: number;
  attendees_count?: number;
  revenue: number | string;
  created_at?: string;
  organizer_name?: string;
  // For debugging
  _raw?: any;
};

type Analytics = {
  totalSellers: number;
  totalProducts: number;
  totalOrganizers: number;
  totalEvents: number;
  totalRevenue: number;
  monthlyGrowth: {
    sellers: number;
    products: number;
    organizers: number;
    events: number;
    revenue: number;
  };
};

// Helper functions
const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null) {
    return '$0.00'; // or any default value you prefer
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const getStatusBadgeClass = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-green-900/30 text-green-400 border border-green-800';
    case 'inactive':
      return 'bg-yellow-900/30 text-yellow-400 border border-yellow-800';
    case 'suspended':
      return 'bg-red-900/30 text-red-400 border border-red-800';
    case 'pending':
      return 'bg-blue-900/30 text-blue-400 border border-blue-800';
    case 'in stock':
      return 'bg-green-900/30 text-green-400 border border-green-800';
    case 'low stock':
      return 'bg-yellow-900/30 text-yellow-400 border border-yellow-800';
    case 'out of stock':
      return 'bg-red-900/30 text-red-400 border border-red-800';
    case 'upcoming':
      return 'bg-blue-900/30 text-blue-400 border border-blue-800';
    case 'ongoing':
      return 'bg-green-900/30 text-green-400 border border-green-800';
    case 'completed':
      return 'bg-gray-800/50 text-gray-300 border border-gray-700';
    case 'cancelled':
      return 'bg-red-900/30 text-red-400 border border-red-800';
    default:
      return 'bg-gray-800/50 text-gray-300 border border-gray-700';
  }
};

export function AdminDashboard() {
  // Navigation
  const navigate = useNavigate();
  
  // State for tabs and UI
  const [activeTab, setActiveTab] = useState('overview');
  
  // Event modal state
  const [selectedEvent, setSelectedEvent] = useState<Event & { ticketTypes?: any[] } | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  
  // Ticket buyers modal state
  const [ticketBuyers, setTicketBuyers] = useState<any[]>([]);
  const [filteredBuyers, setFilteredBuyers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBuyersModalOpen, setIsBuyersModalOpen] = useState(false);
  const [isLoadingBuyers, setIsLoadingBuyers] = useState(false);
  const [buyersError, setBuyersError] = useState<string | null>(null);

  // Apply dark theme to the body
  useEffect(() => {
    document.body.className = 'bg-gray-900 text-white';
    // Cleanup function to reset the body class when component unmounts
    return () => {
      document.body.className = '';
    };
  }, []);

  // Fetch data using React Query
  const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: adminApi.getAnalytics,
  });

  const { data: sellers, isLoading: isLoadingSellers } = useQuery<Seller[]>({
    queryKey: ['admin', 'sellers'],
    queryFn: adminApi.getSellers,
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['admin', 'products'],
    queryFn: adminApi.getProducts,
  });

  const { data: organizers, isLoading: isLoadingOrganizers } = useQuery<Organizer[]>({
    queryKey: ['admin', 'organizers'],
    queryFn: adminApi.getOrganizers,
  });

  // Fetch events data
  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ['adminEvents'],
    queryFn: async () => {
      const data = await adminApi.getEvents();
      console.log('Events data received:', data);
      if (data && data.length > 0) {
        console.log('First event data:', data[0]);
        console.log('First event revenue type:', typeof data[0].revenue, 'value:', data[0].revenue);
        console.log('First event attendees:', data[0].attendees, 'attendees_count:', data[0].attendees_count);
      }
      return data;
    },
  });

  // Handle event click
  const handleEventClick = async (event: Event) => {
    setSelectedEvent(event);
    setIsLoadingTickets(true);
    setTicketError(null);
    
    try {
      // Fetch ticket types
      const ticketTypesData = await adminApi.getEventTicketTypes(event.id).catch(error => {
        console.error('Error fetching ticket types:', error);
        setTicketError('Failed to load ticket information');
        return null;
      });

      // Update ticket types if fetch was successful
      if (ticketTypesData) {
        setSelectedEvent(prev => ({
          ...prev!,
          ticketTypes: ticketTypesData.data.event.ticket_types
        }));
      }
    } catch (error) {
      console.error('Error in event click handler:', error);
      setTicketError('An error occurred while loading event details');
    } finally {
      setIsLoadingTickets(false);
      setIsEventModalOpen(true);
    }
  };

  // Handle logout
  const handleLogout = () => {
    adminApi.logout();
    navigate('/admin/login');
  };

  // Debug analytics data
  console.log('Analytics data:', analytics);
  console.log('Is analytics loading:', isLoadingAnalytics);
  console.log('Analytics error:', useQuery({ queryKey: ['admin', 'analytics'] }).error);

  // Loading state
  const isLoading = isLoadingAnalytics || isLoadingSellers || isLoadingProducts || 
                  isLoadingOrganizers || isLoadingEvents;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  // Enhanced safe data accessor function with error handling
  const safeGet = (obj: any, path: string, defaultValue: any = '') => {
    try {
      if (!obj) return defaultValue;
      const value = path.split('.').reduce((acc, key) => {
        if (acc === null || acc === undefined) return undefined;
        return acc[key];
      }, obj);
      return value !== undefined ? value : defaultValue;
    } catch (error) {
      console.error(`Error accessing path '${path}':`, { obj, error });
      return defaultValue;
    }
  };

  // Safe number formatter
  const safeNumber = (value: any, defaultValue: number = 0): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? defaultValue : num;
    }
    return defaultValue;
  };

  // Safe date formatter
  const safeDate = (dateString: any, formatString: string = 'MMM d, yyyy'): string => {
    try {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? 'Invalid Date' : format(date, formatString);
    } catch (error) {
      console.error('Error formatting date:', { dateString, error });
      return 'N/A';
    }
  };

  // Define table columns
  const sellerColumns: ColumnDef<Seller>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const name = row.getValue('name') as string;
        return <div className="font-medium text-white">{name || 'Unnamed Seller'}</div>;
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => {
        const email = row.getValue('email') as string;
        return <span className="text-gray-300">{email}</span>;
      },
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => {
        const phone = row.getValue('phone') as string;
        return <span className="text-gray-400">{phone || 'N/A'}</span>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(status)}`}>
            {status}
          </span>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }) => {
        const date = new Date(row.getValue('createdAt'));
        return <span className="text-gray-400">{date.toLocaleDateString()}</span>;
      },
    },
  ];

  const productColumns: ColumnDef<Product>[] = [
    {
      accessorKey: 'name',
      header: 'Product',
      cell: ({ row }) => {
        const name = row.getValue('name') as string;
        return <div className="font-medium text-white">{name || 'Unnamed Product'}</div>;
      },
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => {
        const price = parseFloat(row.getValue('price'));
        return <span className="text-green-400">{formatCurrency(price)}</span>;
      },
    },
    {
      accessorKey: 'stock',
      header: 'Stock',
      cell: ({ row }) => {
        const stock = row.getValue('stock') as number;
        return <span className={stock < 10 ? 'text-yellow-400' : 'text-green-400'}>{stock}</span>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(status)}`}>
            {status}
          </span>
        );
      },
    },
  ];

  const organizerColumns: ColumnDef<Organizer>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const name = row.getValue('name') as string;
        return <div className="font-medium text-white">{name || 'Unnamed Organizer'}</div>;
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => {
        const email = row.getValue('email') as string;
        return <span className="text-gray-300">{email}</span>;
      },
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => {
        const phone = row.getValue('phone') as string;
        return <span className="text-gray-400">{phone || 'N/A'}</span>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(status)}`}>
            {status}
          </span>
        );
      },
    },
  ];



  // Function to handle viewing ticket buyers
  const handleViewTicketBuyers = async (eventId: number) => {
    setIsLoadingBuyers(true);
    setBuyersError(null);
    setSearchQuery(''); // Reset search query when opening modal
    
    try {
      const ticketBuyersData = await adminApi.getEventTicketBuyers(eventId);
      const buyers = ticketBuyersData.data.tickets || [];
      setTicketBuyers(buyers);
      setFilteredBuyers(buyers);
      setIsBuyersModalOpen(true);
    } catch (error) {
      console.error('Error fetching ticket buyers:', error);
      setBuyersError('Failed to load buyer information');
    } finally {
      setIsLoadingBuyers(false);
    }
  };

  // Filter ticket buyers based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredBuyers(ticketBuyers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = ticketBuyers.filter(buyer => 
      (buyer.customer_name?.toLowerCase().includes(query)) ||
      (buyer.customer_email?.toLowerCase().includes(query)) ||
      (buyer.ticket_type_name?.toLowerCase().includes(query))
    );
    
    setFilteredBuyers(filtered);
  }, [searchQuery, ticketBuyers]);

  // Define columns configuration
  const eventColumns: ColumnDef<Event>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      cell: ({ row }) => <span className="text-indigo-300">{row.original.id || 'N/A'}</span>,
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <button 
          className="text-left text-indigo-300"
          onClick={() => handleEventClick(row.original)}
        >
          {row.original.title || 'Untitled Event'}
        </button>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => {
        const date = new Date(row.getValue('date'));
        return <span className="text-gray-400">{date.toLocaleDateString()}</span>;
      },
    },
    {
      accessorKey: 'attendees',
      header: 'Attendees',
      cell: ({ row }) => {
        const attendees = safeNumber(safeGet(row.original, 'attendees', 0));
        return <span className="text-gray-400">{attendees.toLocaleString()}</span>;
      },
    },
    {
      accessorKey: 'revenue',
      header: 'Revenue',
      cell: ({ row }) => {
        const revenue = safeNumber(safeGet(row.original, 'revenue', 0));
        return <span className="text-green-400">{formatCurrency(revenue)}</span>;
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(status)}`}>
            {status}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="bg-indigo-600 text-white hover:bg-indigo-700 border-0 text-xs"
          onClick={() => handleViewTicketBuyers(row.original.id)}
        >
          View Buyers
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="container mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-800 p-1 rounded-lg">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-md px-4 py-2"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="sellers" 
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-md px-4 py-2"
            >
              Sellers
            </TabsTrigger>
            <TabsTrigger 
              value="products" 
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-md px-4 py-2"
            >
              Products
            </TabsTrigger>
            <TabsTrigger 
              value="organizers" 
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-md px-4 py-2"
            >
              Organizers
            </TabsTrigger>
            <TabsTrigger 
              value="events" 
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-md px-4 py-2"
            >
              Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {isLoadingAnalytics ? (
                <div>Loading analytics...</div>
              ) : (
                <>
                  <DashboardCard 
                    title="Total Sellers" 
                    value={analytics?.totalSellers?.toString() || 'N/A'} 
                    description={`${analytics?.monthlyGrowth?.sellers || 0}% from last month`} 
                  />
                  <DashboardCard 
                    title="Total Products" 
                    value={analytics?.totalProducts?.toString() || 'N/A'} 
                    description={`${analytics?.monthlyGrowth?.products || 0}% from last month`} 
                  />
                </>
              )}
              <DashboardCard 
                title="Total Organizers" 
                value={analytics?.totalOrganizers.toString() || '0'} 
                description={`${analytics?.monthlyGrowth.organizers || 0}% from last month`} 
              />
              <DashboardCard 
                title="Total Events" 
                value={analytics?.totalEvents.toString() || '0'} 
                description={`${analytics?.monthlyGrowth.events || 0}% from last month`} 
              />
            </div>
          </TabsContent>

          <TabsContent value="sellers" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Sellers</CardTitle>
                <CardDescription className="text-gray-300">Manage sellers on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable 
                  data={sellers || []} 
                  columns={sellerColumns}
                  searchKey="name"
                  placeholder="Search by name or email..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Products</CardTitle>
                <CardDescription className="text-gray-300">Manage products in the marketplace</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable 
                  data={products || []} 
                  columns={productColumns}
                  searchKey="name"
                  placeholder="Search products..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="organizers" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Organizers</CardTitle>
                <CardDescription className="text-gray-300">Manage event organizers</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable 
                  data={organizers || []} 
                  columns={organizerColumns}
                  searchKey="name"
                  placeholder="Search by name or email..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Events</CardTitle>
                <CardDescription className="text-gray-300">Manage all events</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable 
                  data={events || []} 
                  columns={eventColumns}
                  searchKey="title"
                  placeholder="Search by title or status..."
                  showPagination={false}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Event Details Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white sm:max-w-[600px]">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">{selectedEvent.title || 'Event Details'}</DialogTitle>
                <DialogDescription className="text-gray-300">
                  {selectedEvent.organizer_name && `Organized by ${selectedEvent.organizer_name}`}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">Date & Time</h4>
                    <p className="text-white">
                      {selectedEvent.start_date 
                        ? new Date(selectedEvent.start_date).toLocaleString()
                        : 'Not specified'}
                      {selectedEvent.end_date && (
                        <span> to {new Date(selectedEvent.end_date).toLocaleString()}</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">Location</h4>
                    <p className="text-white">{selectedEvent.location || 'Not specified'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-400">Status</h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(selectedEvent.status)}`}>
                    {selectedEvent.status || 'Unknown'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">Attendees</h4>
                    <p className="text-white">
                      {selectedEvent.attendees || selectedEvent.attendees_count || 0}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">Revenue</h4>
                    <p className="text-green-400">
                      {typeof selectedEvent.revenue === 'number' 
                        ? formatCurrency(selectedEvent.revenue)
                        : selectedEvent.revenue || '$0.00'}
                    </p>
                  </div>
                </div>

                {selectedEvent.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400">Description</h4>
                    <p className="text-white mt-1">{selectedEvent.description}</p>
                  </div>
                )}
              </div>

              {/* Ticket Information Section */}
              <div className="mt-6 border-t border-gray-700 pt-4">
                <h3 className="text-lg font-medium text-white mb-4">Ticket Information</h3>
                
                {isLoadingTickets ? (
                  <div className="flex justify-center py-4">
                    <Spinner className="h-6 w-6 text-indigo-400" />
                  </div>
                ) : ticketError ? (
                  <div className="text-red-400 text-sm mb-4">{ticketError}</div>
                ) : selectedEvent?.ticketTypes?.length ? (
                  <div className="space-y-4">
                    {selectedEvent.ticketTypes.map((ticketType) => (
                      <div key={ticketType.id} className="bg-gray-800 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-white">{ticketType.name}</h4>
                            {ticketType.description && (
                              <p className="text-sm text-gray-300 mt-1">{ticketType.description}</p>
                            )}
                          </div>
                          <span className="text-lg font-semibold text-white">
                            {formatCurrency(ticketType.price)}
                          </span>
                        </div>
                        
                        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <div className="text-gray-400">Available</div>
                            <div className="text-white">{ticketType.available || 0} / {ticketType.quantity || '∞'}</div>
                          </div>
                          <div>
                            <div className="text-gray-400">Sold</div>
                            <div className="text-white">{ticketType.sold || 0}</div>
                          </div>
                          <div>
                            <div className="text-gray-400">Status</div>
                            <div className={ticketType.is_sold_out ? 'text-red-400' : 'text-green-400'}>
                              {ticketType.is_sold_out ? 'Sold Out' : 'Available'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-4">No ticket information available.</div>
                )}
                
                <div className="mt-6 flex justify-end space-x-3">
                  <Button 
                    variant="outline" 
                    className="bg-indigo-600 text-white hover:bg-indigo-700 border-0"
                    onClick={() => {
                      if (selectedEvent) {
                        handleViewTicketBuyers(selectedEvent.id);
                      }
                    }}
                  >
                    View Buyers
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-gray-600 text-white hover:bg-gray-700"
                    onClick={() => setIsEventModalOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Ticket Buyers Modal */}
      <Dialog open={isBuyersModalOpen} onOpenChange={setIsBuyersModalOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between items-center">
                <div>
                  <DialogTitle className="text-2xl font-bold">Ticket Buyers</DialogTitle>
                  <DialogDescription className="text-gray-300">
                    {selectedEvent?.title ? `${selectedEvent.title} - ` : ''}Buyer List
                  </DialogDescription>
                </div>
                <div className="relative w-64">
                  <Input
                    type="text"
                    placeholder="Search buyers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pl-10"
                  />
                  <svg
                    className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </DialogHeader>
          
          {isLoadingBuyers ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-8 w-8 text-indigo-400" />
            </div>
          ) : buyersError ? (
            <div className="text-red-400 text-center py-4">{buyersError}</div>
          ) : filteredBuyers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Ticket Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredBuyers.map((buyer) => (
                    <tr key={buyer.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-white">{buyer.customer_name || 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{buyer.customer_email || 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">{buyer.ticket_type_name || 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                        {buyer.price ? formatCurrency(parseFloat(buyer.price)) : 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span 
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            buyer.status === 'paid' ? 'bg-green-900/30 text-green-400 border border-green-800' :
                            buyer.status === 'cancelled' || buyer.status === 'refunded' ? 'bg-red-900/30 text-red-400 border border-red-800' :
                            'bg-yellow-900/30 text-yellow-400 border border-yellow-800'
                          }`}
                        >
                          {buyer.status ? buyer.status.charAt(0).toUpperCase() + buyer.status.slice(1) : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              {searchQuery 
                ? 'No matching ticket buyers found.' 
                : 'No ticket buyers found for this event.'}
            </div>
          )}
          
          <div className="mt-6 flex justify-end">
            <Button 
              variant="outline" 
              className="border-gray-600 text-black hover:bg-gray-700"
              onClick={() => setIsBuyersModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DashboardCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <Card className="bg-gray-700 border-gray-600 hover:bg-gray-600 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
        <CardTitle className="text-sm font-medium text-gray-300">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="text-2xl font-bold text-white">{value}</div>
        <p className="text-xs text-gray-400 mt-1">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
