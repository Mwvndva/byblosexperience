import { RouteObject, createBrowserRouter } from 'react-router-dom';
import { AdminLogin } from '@/pages/admin/LoginPage';
import { AdminDashboard } from '@/pages/admin/DashboardPage';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';

// Admin routes configuration
export const adminRoutes: RouteObject[] = [
  {
    path: 'login',
    element: <AdminLogin />,
  },
  {
    element: <AdminProtectedRoute />,
    children: [
      {
        path: 'dashboard',
        element: <AdminDashboard />,
      },
      {
        path: '',
        element: <AdminDashboard />, // Redirect to dashboard by default
      },
    ],
  },
];

// Create and export the admin router
export const adminRouter = {
  routes: adminRoutes,
  router: createBrowserRouter([
    {
      path: '/admin/*',
      children: adminRoutes,
    },
  ]),
};
