import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter, Outlet } from "react-router-dom";
import { routes } from "./routes";
import { OrganizerAuthProvider } from "./contexts/OrganizerAuthContext";
import { ReactNode } from "react";

const queryClient = new QueryClient();

// Create a wrapper component that will be used by the router
const AppWrapper = ({ children }: { children: ReactNode }) => (
  <OrganizerAuthProvider>
    <TooltipProvider>
      <Toaster />
      {children}
    </TooltipProvider>
  </OrganizerAuthProvider>
);

// Create the router with the wrapper component and routes
const router = createBrowserRouter([
  {
    element: <AppWrapper><Outlet /></AppWrapper>,
    children: routes,
  },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} fallbackElement={<div>Loading...</div>} />
  </QueryClientProvider>
);

export default App;
