// Load environment variables first
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdir } from 'fs/promises';
import express from 'express';
import organizerRoutes from './routes/organizer.routes';
import sellerRoutes from './routes/seller.routes';
import dashboardRoutes from './routes/dashboard.routes';
import publicRoutes from './routes/public.routes';
import healthRoutes from './routes/health.routes';
import ticketRoutes from './routes/ticket.routes';
import eventRoutes from './routes/event.routes';
import { pool, testConnection as testDbConnection } from './config/database.js';
import { globalErrorHandler, notFoundHandler } from './utils/errorHandler.js';
import { protect } from './middleware/auth.js';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from Render
dotenv.config();

// Debug log environment variables (without sensitive data)
console.log('Environment variables loaded:');
console.log({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD ? '***' : undefined
});

// Create Express app
const app = express();

// CORS middleware with logging
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log('CORS Request:', {
    method: req.method,
    url: req.url,
    origin: req.headers.origin
  });

  // Get origin header
  const origin = req.headers.origin as string | undefined;
  
  // Set CORS headers
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  // Allow these headers and methods
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('CORS Preflight request handled');
    res.status(200).end();
    return;
  }

  next();
});

// Test database connection
const testConnection = async () => {
  try {
    console.log('Starting database connection test...');
    await testDbConnection();
    console.log('✅ Database connection test completed successfully');
    return true;
  } catch (error: unknown) {
    // Handle Node.js error types
    const isNodeError = error instanceof Error && ('code' in error);
    
    console.error('❌ Database connection test failed:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: isNodeError ? (error as any).code : undefined,
      detail: error instanceof Error ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    });
    console.error('Please check your database configuration in .env and ensure the database is running');
    throw error instanceof Error ? error : new Error('Unknown error'); // Re-throw to be handled by the caller
  }
};

// Routes - Public routes first to ensure they take precedence
app.use('/api/health', healthRoutes);
app.use('/api', publicRoutes);
app.use('/api/sellers', sellerRoutes);

// Mount ticket routes (includes public endpoints)
app.use('/api/tickets', ticketRoutes);

// Mount organizer public routes (login, register, etc.)
app.use('/api/organizers', organizerRoutes);

// Mount event routes at root level
app.use('/events', eventRoutes);

// Organizer protected routes
const protectedRouter = express.Router();

// Apply protect middleware to all protected routes
protectedRouter.use(protect);

// Mount protected routes
protectedRouter.use('/dashboard', dashboardRoutes);
protectedRouter.use('/tickets', ticketRoutes);
protectedRouter.use('/events', eventRoutes); // Mount event routes at /api/organizers/events

// Mount the protected router under /api/organizers
app.use('/api/organizers', protectedRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// 404 handler - must be after all other routes
app.all('*', notFoundHandler);

// Global error handler - must be after all other middleware
app.use(globalErrorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection before starting the server
    await testConnection();
    
    const port = parseInt(process.env.PORT || '3000', 10);
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`📡 API available at http://localhost:${port}/api`);
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use. Please free the port or use a different one.`);
      } else {
        console.error('❌ Server error:', error);
      }
      process.exit(1);
    });

    // Handle process termination
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error: unknown) {
    // Handle Node.js error types
    const isNodeError = error instanceof Error && ('code' in error);
    
    console.error('❌ Failed to start server:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: isNodeError ? (error as any).code : undefined,
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
};

startServer();

export default app;
