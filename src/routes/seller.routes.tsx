import React, { useState, useEffect } from 'react';
import { RouteObject, Navigate, Outlet, useOutletContext, useNavigate } from 'react-router-dom';
import { SellerLayout } from '../components/layout/SellerLayout';
import SellerDashboard from '../components/seller/SellerDashboard';
import SellerRegistration from '../components/seller/SellerRegistration';
import { SellerLogin } from '../components/seller/SellerLogin';
import { ProductsList } from '../components/seller/ProductsList';
import AddProductForm from '../components/seller/AddProductForm';
import { EditProductForm } from '../components/seller/EditProductForm';
import SellerSettings from '../components/seller/SellerSettings';
import { Button } from '../components/ui/button';
import { useToast } from '../hooks/use-toast';
import { sellerApi } from '../api/sellerApi';
import SellerOrdersPage from '../pages/seller/SellerOrdersPage';
import { Plus, Pencil, Trash2, EyeOff, RefreshCw, CheckCircle } from 'lucide-react';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { formatCurrency } from '../lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

// Products route component that will be rendered within the dashboard
function ProductsListWrapper() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusUpdate, setStatusUpdate] = useState<{
    productId: string | null;
    isOpen: boolean;
    isSold: boolean;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await sellerApi.getProducts();
        setProducts(response);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast({
          title: 'Error loading products',
          description: 'Failed to load products. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await sellerApi.deleteProduct(id);
        // Refresh the products list
        const response = await sellerApi.getProducts();
        setProducts(response);
        toast({
          title: 'Success',
          description: 'Product deleted successfully',
        });
      } catch (error) {
        console.error('Failed to delete product:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete product',
          variant: 'destructive',
        });
      }
    }
  };

  const handleEdit = (id: string) => {
    navigate(`/seller/products/${id}/edit`);
  };

  const handleAddProduct = () => {
    navigate('/seller/add-product');
  };

  const handleStatusUpdate = async (productId: string, isSold: boolean) => {
    try {
      // Start with optimistic update
      setProducts(products.map(product => 
        product.id === productId ? {
          ...product,
          status: isSold ? 'sold' : 'available',
          isSold,
          soldAt: isSold ? new Date().toISOString() : null
        } : product
      ));

      // Update the server
      await sellerApi.updateProduct(productId, {
        status: isSold ? 'sold' : 'available',
        isSold,
        soldAt: isSold ? new Date().toISOString() : null
      });

      toast({
        title: 'Success',
        description: isSold ? 'Product marked as sold' : 'Product marked as available',
      });
      setStatusUpdate(null);
    } catch (error) {
      // If there's an error, revert the local state
      setProducts(products.map(product => 
        product.id === productId ? {
          ...product,
          status: isSold ? 'available' : 'sold',
          isSold: !isSold,
          soldAt: isSold ? null : product.soldAt
        } : product
      ));

      console.error('Failed to update product status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product status. Changes have been reverted.',
        variant: 'destructive',
      });
      setStatusUpdate(null);
    }
  };

  const handleOpenStatusDialog = (productId: string, isSold: boolean) => {
    setStatusUpdate({ productId, isOpen: true, isSold });
  };

  const handleCloseStatusDialog = () => {
    setStatusUpdate(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">My Products</h2>
        <Button
          onClick={handleAddProduct}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Product
        </Button>
      </div>

      <ProductsList 
        products={products} 
        onDelete={handleDelete}
        onEdit={handleEdit}
        onStatusUpdate={async (productId, status, soldAt) => {
          await handleStatusUpdate(productId, status === 'sold');
        }}
        onRefresh={() => {
          const fetchProducts = async () => {
            try {
              const response = await sellerApi.getProducts();
              setProducts(response);
            } catch (error) {
              console.error('Error fetching products:', error);
              toast({
                title: 'Error loading products',
                description: 'Failed to load products. Please try again later.',
                variant: 'destructive',
              });
            }
          };
          fetchProducts();
        }}
      />

      {statusUpdate && (
        <AlertDialog open={statusUpdate.isOpen} onOpenChange={handleCloseStatusDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {statusUpdate.isSold ? 'Mark as Sold' : 'Mark as Available'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {statusUpdate.isSold ? 'mark this product as sold' : 'mark this product as available'}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleStatusUpdate(statusUpdate.productId, statusUpdate.isSold)}
              >
                {statusUpdate.isSold ? 'Mark as Sold' : 'Mark as Available'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// Protected route component
const ProtectedRoute = () => {
  const token = localStorage.getItem('sellerToken');
  return token ? <Outlet /> : <Navigate to="/seller/login" replace />;
};

// Routes accessible only to unauthenticated users
const GuestRoute = () => {
  const token = localStorage.getItem('sellerToken');
  return !token ? <Outlet /> : <Navigate to="/seller/dashboard" replace />;
};

// Create the seller routes
export const sellerRoutes: RouteObject[] = [
  // Public auth routes (no layout)
  {
    path: '/seller/reset-password',
    element: <ResetPasswordPage />,
  },
  
  // Main seller routes with layout
  {
    path: '/seller',
    element: <SellerLayout><Outlet /></SellerLayout>,
    children: [
      // Public routes
      {
        element: <GuestRoute />,
        children: [
          {
            path: 'register',
            element: <SellerRegistration />,
          },
          {
            path: 'login',
            element: <SellerLogin />,
          },
        ],
      },
      
      // Protected routes
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: 'dashboard',
            element: <SellerDashboard />,
            children: [
              {
                index: true,
                element: (
                  <div className="p-6">
                    <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {/* Overview content will be rendered by SellerDashboard */}
                    </div>
                  </div>
                ),
              },
            ],
          },
          {
            path: 'products',
            element: <ProductsListWrapper />,
          },
          {
            path: 'products/:id/edit',
            element: <EditProductForm onSuccess={() => {}} />,
          },
          {
            path: 'add-product',
            element: <AddProductForm onSuccess={() => {}} />,
          },
          {
            path: 'settings',
            element: <SellerSettings />,
          },
          {
            path: 'orders',
            element: <SellerOrdersPage />,
          },
          
          // Redirects for protected routes
          {
            path: '',
            element: <Navigate to="dashboard" replace />,
          },
          {
            path: '*',
            element: <Navigate to="dashboard" replace />,
          },
        ],
      },
      
      // Redirects for non-protected routes
      {
        path: '',
        element: <Navigate to="login" replace />,
      },
      {
        path: '*',
        element: <Navigate to="login" replace />,
      },
    ],
  },
];
