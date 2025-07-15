import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, User, Package, Plus, Settings, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface SellerLayoutProps {
  children: React.ReactNode;
}

export function SellerLayout({ children }: SellerLayoutProps) {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isAuthenticated = localStorage.getItem('sellerToken') !== null;
  const isLoginPage = location.pathname === '/seller/login';
  const isRegisterPage = location.pathname === '/seller/register';

  const handleLogout = () => {
    localStorage.removeItem('sellerToken');
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out.',
    });
    navigate('/seller/login');
  };

  const navigation = [
    {
      name: 'Dashboard',
      href: '/seller/dashboard',
      icon: Home,
      current: location.pathname === '/seller/dashboard',
    },
    {
      name: 'Products',
      href: '/seller/products',
      icon: Package,
      current: location.pathname.startsWith('/seller/products'),
    },
    {
      name: 'Add Product',
      href: '/seller/add-product',
      icon: Plus,
      current: location.pathname === '/seller/add-product',
    },
    {
      name: 'Orders',
      href: '/seller/orders',
      icon: Package,
      current: location.pathname.startsWith('/seller/orders'),
    },
    {
      name: 'Settings',
      href: '/seller/settings',
      icon: Settings,
      current: location.pathname === '/seller/settings',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main layout */}
      <div className="flex flex-1">
        {/* Mobile menu button */}
        {isAuthenticated && (
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 left-4 z-50"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <User className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Mobile menu */}
        {isAuthenticated && (
          <div
            className={cn(
              'fixed inset-0 bg-gray-900 bg-opacity-50 z-40 md:hidden',
              isMobileMenuOpen ? 'block' : 'hidden'
            )}
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile menu content */}
        {isAuthenticated && (
          <div
            className={cn(
              'fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-50 md:hidden',
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
              'transition-transform duration-300'
            )}
          >
            <nav className="py-4">
              <div className="px-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center space-x-2 text-sm font-medium rounded-md px-3 py-2 text-gray-700 hover:bg-gray-50 mb-2',
                      item.current && 'bg-gray-100 text-indigo-600'
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        )}

        {/* Desktop sidebar */}
        {isAuthenticated && (
          <div className="hidden md:flex w-64 flex-col bg-white shadow-lg">
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
                <div className="px-3">
                  <nav className="mt-5">
                    {navigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={cn(
                          'flex items-center space-x-2 text-sm font-medium rounded-md px-3 py-2 text-gray-700 hover:bg-gray-50 mb-2',
                          item.current && 'bg-gray-100 text-indigo-600'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Link>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          {!isLoginPage && !isRegisterPage && (
            <header className="bg-white shadow">
              <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex justify-end items-center">
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </button>
                </div>
              </div>
            </header>
          )}

          {/* Content */}
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="container mx-auto px-4 py-6">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile footer */}
      {!isLoginPage && !isRegisterPage && (
        <footer className="md:hidden border-t border-gray-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500"> 2025 Byblos Experience</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
