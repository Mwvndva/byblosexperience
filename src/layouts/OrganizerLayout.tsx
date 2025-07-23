import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, Calendar, Ticket, Settings, Home, FileText, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';

export function OrganizerLayout() {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/organizer/dashboard', icon: Home, current: location.pathname === '/organizer/dashboard' },
    { name: 'Events', href: '/organizer/events', icon: Calendar, current: location.pathname.startsWith('/organizer/events') },
    { name: 'Tickets', href: '/organizer/tickets', icon: Ticket, current: location.pathname.startsWith('/organizer/tickets') },
    { name: 'Settings', href: '/organizer/settings', icon: Settings, current: location.pathname.startsWith('/organizer/settings') },
    { name: 'Terms & Conditions', href: '/organizer/terms', icon: FileText, current: location.pathname.startsWith('/organizer/terms') },
  ];

  const handleLogout = async () => {
    try {
      // Optional: Call your logout API if you have one
      // await api.post('/organizer/logout');
      
      // Clear the token
      localStorage.removeItem('organizerToken');
      
      // Show success message
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
      
      // Force a hard redirect to ensure all state is cleared
      window.location.href = '/organizer/login';
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, still try to redirect
      window.location.href = '/organizer/login';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          type="button"
          className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-gray-800 focus:outline-none"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span className="sr-only">Open main menu</span>
          <Menu className="block h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="fixed inset-0 bg-black bg-opacity-70" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-gray-800">
            <div className="h-full overflow-y-auto">
              <div className="px-4 pt-5 pb-4">
                <div className="flex items-center justify-between px-4">
                  <Link to="/" className="text-xl font-bold text-white">Byblos</Link>
                </div>
                <nav className="mt-5 space-y-1">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'flex items-center space-x-2 text-sm font-medium rounded-md px-3 py-2',
                        item.current ? 'bg-gray-700 text-yellow-300' : 'text-gray-200 hover:bg-gray-700'
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
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

      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-64 flex-col bg-gray-800 shadow-lg fixed inset-y-0 z-30">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="px-3">
              <Link to="/" className="text-xl font-bold text-white block mb-6 px-3">Byblos</Link>
              <nav className="space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center space-x-2 text-sm font-medium rounded-md px-3 py-2',
                      item.current ? 'bg-gray-700 text-yellow-300' : 'text-gray-200 hover:bg-gray-700'
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

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="bg-gray-800 shadow-lg">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex justify-end items-center">
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-yellow-300 text-sm font-medium rounded-md shadow-sm text-yellow-300 bg-transparent hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 bg-gray-900">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 text-white">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
