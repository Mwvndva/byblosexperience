import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/organizer/Sidebar';
import { Header } from '@/components/organizer/Header';
import { Toaster } from '@/components/ui/toaster';

export function OrganizerLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex pt-16 overflow-hidden bg-gray-50">
        <Sidebar />
        <main className="relative w-full h-full overflow-y-auto lg:ml-64">
          <div className="px-4 pt-6 pb-8 mx-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
