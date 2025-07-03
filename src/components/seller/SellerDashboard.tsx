import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Home, 
  Package, 
  Plus, 
  Settings, 
  ShoppingCart, 
  DollarSign, 
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import { sellerApi } from '@/api/sellerApi';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  image_url: string;
  imageUrl?: string;
  aesthetic: string;
  createdAt: string;
  updatedAt?: string;
  sold?: number;
  status?: 'available' | 'sold';
  isSold?: boolean;
}

interface AnalyticsData {
  totalProducts: number;
  totalRevenue: number;
  monthlySales: Array<{ month: string; sales: number }>;
  totalTicketsSold?: number;
}

interface SellerDashboardProps {
  children?: (props: { 
    fetchData: () => Promise<{
      totalProducts: number;
      totalRevenue: number;
      monthlySales: Array<{ month: string; sales: number }>;
      totalTicketsSold: number;
    }> 
  }) => React.ReactNode;
}

const SellerDashboard: React.FC<SellerDashboardProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch data function
  const fetchData = useCallback(async (): Promise<{
    totalProducts: number;
    totalRevenue: number;
    monthlySales: Array<{ month: string; sales: number }>;
    totalTicketsSold: number;
  }> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check for seller token first
      const token = localStorage.getItem('sellerToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch products
      const productsData = await sellerApi.getProducts();
      setProducts(productsData);

      // Filter sold products
      const soldProducts = productsData.filter(p => p.isSold || p.status === 'sold');
      const totalSoldProducts = soldProducts.length;
      
      // Calculate analytics
      const totalRevenue = soldProducts.reduce((sum, p) => sum + p.price, 0);
      
      // Create analytics data structure
      const processedAnalytics = {
        totalProducts: productsData.length,
        totalRevenue: totalRevenue,
        monthlySales: [], // We don't have date data for monthly sales
        publishedProducts: productsData.length - totalSoldProducts // Assuming non-sold are published
      };
      
      const result = {
        totalProducts: processedAnalytics.totalProducts,
        totalRevenue: processedAnalytics.totalRevenue,
        monthlySales: processedAnalytics.monthlySales,
        totalTicketsSold: totalSoldProducts || 0
      };
      
      setAnalytics(processedAnalytics);
      return result;
      
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
      
      // If unauthorized, clear token and redirect to login
      if (err.response?.status === 401) {
        localStorage.removeItem('sellerToken');
        toast({
          title: 'Session expired',
          description: 'Please log in again to continue',
          variant: 'destructive',
        });
        navigate('/seller/login', { state: { from: location.pathname } });
      } else {
        toast({
          title: 'Error',
          description: err.response?.data?.message || 'Failed to load dashboard data',
          variant: 'destructive',
        });
      }
      
      // Return default values in case of error
      return {
        totalProducts: 0,
        totalRevenue: 0,
        monthlySales: [],
        totalTicketsSold: 0,
      };
    } finally {
      setIsLoading(false);
    }
  }, [navigate, toast, location.pathname]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle product deletion
  const handleDeleteProduct = async (productId: string) => {
    try {
      await sellerApi.deleteProduct(productId);
      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      });
      // Refresh the products list
      fetchData();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive',
      });
    }
  };

  // Create context value to pass to child routes
  const outletContext = {
    products,
    onDeleteProduct: handleDeleteProduct,
    fetchData,
  };

  // If children are provided, render them with the fetchData function
  if (children) {
    return (
      <div className="space-y-6">
        {children({ fetchData })}
      </div>
    );
  }

  // Calculate total sold products
  const totalSold = products.filter(p => p.isSold || p.status === 'sold').length;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-1" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3">
                  <Skeleton className="aspect-square w-full rounded-md" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-6 w-1/3 mt-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (!analytics || error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 p-6 text-center">
        <p className="text-red-500">
          {error || 'Unable to load dashboard data. Please try again later.'}
        </p>
        <Button 
          onClick={fetchData}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  // Main dashboard UI
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Seller Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={fetchData}
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link 
            to="/" 
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 mr-2" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" 
                clipRule="evenodd" 
              />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Products in your store</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Total revenue generated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSold}</div>
            <p className="text-xs text-muted-foreground">Products sold to date</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Products */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Recent Products</CardTitle>
              <CardDescription>Your most recently added products</CardDescription>
            </div>
            <Button 
              size="sm" 
              onClick={() => navigate('/seller/add-product')}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {products.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {products.slice(0, 3).map((product) => (
                <div key={product.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gray-100 rounded-md overflow-hidden mb-3">
                    {product.image_url || product.imageUrl ? (
                      <img
                        src={product.image_url || product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <Package className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium text-gray-900 line-clamp-1">{product.name}</h3>
                  <p className="text-sm text-gray-500 mb-1">{product.aesthetic}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(product.price)}
                    </span>
                    <Badge 
                      variant={product.status === 'sold' || product.isSold ? 'destructive' : 'outline'}
                      className="text-xs"
                    >
                      {product.status === 'sold' || product.isSold ? 'Sold' : 'Available'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-4">
              <Package className="h-12 w-12 mx-auto text-gray-300" />
              <p className="text-gray-500">No products found</p>
              <p className="text-sm text-gray-400">Add your first product to get started</p>
              <Button 
                onClick={() => navigate('/seller/add-product')}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for your store</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => navigate('/seller/products')}
            >
              <Package className="h-4 w-4" />
              View All Products
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => navigate('/seller/orders')}
            >
              <ShoppingCart className="h-4 w-4" />
              View Orders
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => navigate('/seller/settings')}
            >
              <Settings className="h-4 w-4" />
              Store Settings
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from your store</CardDescription>
          </CardHeader>
          <CardContent>
            {products.length > 0 ? (
              <div className="space-y-4">
                {products.slice(0, 3).map((product) => (
                  <div key={product.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center">
                      <Package className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Added on {new Date(product.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {product.status || 'Active'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SellerDashboard;
