import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter, Outlet } from "react-router-dom";
import { OrganizerAuthProvider } from "./contexts/OrganizerAuthContext";
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

// Create a wrapper component that will be used by the main app routes
const AppWrapper = ({ children }: { children: React.ReactNode }) => (
  <OrganizerAuthProvider>
    <TooltipProvider>
      <Toaster />
      {children}
    </TooltipProvider>
  </OrganizerAuthProvider>
);

// Create the main app router with both admin and main app routes
const router = createBrowserRouter([
  // Admin routes
  {
    path: '/admin/*',
    children: adminRouter.routes,
  },
  // Main app routes
  {
    element: (
      <AppWrapper>
        <Outlet />
      </AppWrapper>
    ),
    children: routes,
  },
  // Catch-all route - redirect to home or login
  {
    path: '*',
    element: <div>Page not found</div>,
  },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} fallbackElement={<div>Loading...</div>} />
  </QueryClientProvider>
);

export default App;
