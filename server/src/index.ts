// Load environment variables first
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdir } from 'fs/promises';
import express from 'express';
import cors from 'cors';
import organizerRoutes from './routes/organizer.routes.js';
import sellerRoutes from './routes/seller.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import publicRoutes from './routes/public.routes.js';
import healthRoutes from './routes/health.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import eventRoutes from './routes/event.routes.js';
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

// Configure Express to handle CORS directly
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Get the origin header
  const origin = req.headers.origin as string | undefined;
  
  // Allow requests from specific origins
  const allowedOrigins = [
    'https://byblosexperience.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ];
  
  // Handle CORS for API requests
  if (req.path.startsWith('/api')) {
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    // Allow credentials for API requests
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Specify allowed methods
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    
    // Specify allowed headers
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
  }
  
  next();
});

// Add cookie parser middleware first
import cookieParser from 'cookie-parser';
// @ts-ignore - TypeScript has issues with cookie-parser's default export
app.use(cookieParser());

// Set up request body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS middleware with enhanced logging
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log('CORS Request Details:', {
    origin: req.headers.origin,
    path: req.path,
    method: req.method,
    headers: Object.keys(req.headers)
  });

  const origin = req.headers.origin as string | undefined;
  const allowedOrigins = [
    'https://byblosexperience.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ];

  // Handle CORS for all requests (not just /api)
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'false');
  }

  // Always allow these headers and methods
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
  } catch (error) {
    console.error('❌ Database connection test failed:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    console.error('Please check your database configuration in .env and ensure the database is running');
    throw error; // Re-throw to be handled by the caller
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

// Organizer protected routes
const protectedRouter = express.Router();

// Apply protect middleware to all protected routes
protectedRouter.use(protect);

// Mount protected routes
protectedRouter.use('/dashboard', dashboardRoutes);
protectedRouter.use('/tickets', ticketRoutes);
protectedRouter.use('', eventRoutes); // Mount event routes at /api/organizers/events

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
  } catch (error) {
    console.error('❌ Failed to start server:', {
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    process.exit(1);
  }
};

startServer();

export default app;
