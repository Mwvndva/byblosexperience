import { lazy, Suspense } from 'react';
import { sellerRoutes } from './seller.routes';
import { organizerRoutes } from './organizer.routes';
import { eventRoutes } from './event.routes';
import { ticketRoutes } from './ticket.routes';

// Lazy load the Index page
const IndexPage = lazy(() => import('@/pages/Index'));

// Create a simple loading component
const LoadingFallback = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-floral-600"></div>
  </div>
);

// Main routes configuration
export const routes = [
  {
    path: '/',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <IndexPage />
      </Suspense>
    ),
  },
  ...sellerRoutes,
  ...organizerRoutes,
  ...eventRoutes,
  ...ticketRoutes,
];
