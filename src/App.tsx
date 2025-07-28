import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter, Outlet } from "react-router-dom";
import { OrganizerAuthProvider } from "./contexts/OrganizerAuthContext";
import { AdminAuthProvider } from "./contexts/AdminAuthContext";
import { adminRouter } from "./routes/admin.routes";
import { routes } from "./routes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Create a wrapper component for the main app
const AppWrapper = ({ children }: { children: React.ReactNode }) => (
  <OrganizerAuthProvider>
    <TooltipProvider>
      <Toaster />
      {children}
    </TooltipProvider>
  </OrganizerAuthProvider>
);

// Create a wrapper for admin routes with AdminAuthProvider
const AdminWrapper = ({ children }: { children: React.ReactNode }) => (
  <AdminAuthProvider>
    <TooltipProvider>
      <Toaster />
      {children}
    </TooltipProvider>
  </AdminAuthProvider>
);

// Create the main app router with both admin and main app routes
const router = createBrowserRouter([
  // Admin routes with AdminAuthProvider
  ...adminRouter.routes.map(route => ({
    ...route,
    element: <AdminWrapper>{route.element}</AdminWrapper>,
  })),
  
  // Main app routes
  {
    element: (
      <AppWrapper>
        <Outlet />
      </AppWrapper>
    ),
    children: [
      ...routes,
      {
        path: '*',
        element: <div>Page not found</div>,
      }
    ],
  },
]);

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} fallbackElement={<div>Loading...</div>} />
  </QueryClientProvider>
);

export default App;
