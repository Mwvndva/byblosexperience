import express from 'express';
import {
  createEvent,
  getOrganizerEvents,
  getUpcomingEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  updateEventStatus,
  getDashboardEvents,
  getEventTicketTypes,
  getPublicEvent
} from '../controllers/event.controller.js';
import { protect } from '../middleware/organizerAuth.js';

const router = express.Router();

// Debug middleware to log all incoming requests
router.use((req, res, next) => {
  const requestId = req.id || 'no-request-id';
  console.log(`[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.originalUrl}`);
  next();
});

// ==============================================
// PUBLIC ROUTES - No authentication required
// ==============================================

// 1. Get upcoming events (public) - must be before any dynamic routes
router.get('/public/upcoming', (req, res, next) => {
  const requestId = req.id || 'no-request-id';
  console.log(`[${requestId}] GET /public/upcoming`);
  console.log(`[${requestId}] Query params:`, req.query);
  next();
}, getUpcomingEvents);

// 2. Get ticket types for a specific event (public) - must come before the general event route
router.get('/public/:eventId(\\d+)/ticket-types', (req, res, next) => {
  const requestId = req.id || 'no-request-id';
  console.log(`[${requestId}] GET /public/${req.params.eventId}/ticket-types`);
  next();
}, getEventTicketTypes);

// 3. Get public event details (public) - must be after all other specific routes
router.get('/public/:eventId(\\d+)', (req, res, next) => {
  const requestId = req.id || 'no-request-id';
  console.log(`[${requestId}] GET /public/${req.params.eventId}`);
  next();
}, getPublicEvent);

// 4. Catch-all for invalid public routes
router.get('/public/*', (req, res) => {
  const requestId = req.id || 'no-request-id';
  const path = req.path.replace(/^\/public\//, '');
  
  console.log(`[${requestId}] Invalid public endpoint: /public/${path}`);
  
  // Special case for /public/upcoming with incorrect method
  if (path === 'upcoming' && req.method !== 'GET') {
    return res.status(405).json({
      status: 'error',
      message: 'Method not allowed. Use GET /api/events/public/upcoming',
      requestId
    });
  }
  
  // Check if it's a numeric ID but not a valid endpoint
  if (/^\d+$/.test(path)) {
    return res.status(404).json({
      status: 'error',
      message: 'Event not found',
      requestId
    });
  }
  
  // For non-numeric paths
  res.status(400).json({
    status: 'error',
    message: 'Invalid endpoint. Did you mean /public/upcoming?',
    requestId
  });
});

// ==============================================
// PROTECTED ROUTES - Require authentication
// ==============================================
router.use(protect);

// Create a new event
router.post('/', createEvent);

// Get all events for the authenticated organizer
router.get('/', getOrganizerEvents);

// Get dashboard events (with stats)
router.get('/dashboard', getDashboardEvents);

// Get a specific event by ID (protected)
router.get('/:id(\\d+)', getEvent);

// Update an event
router.put('/:id(\\d+)', updateEvent);

// Delete an event
router.delete('/:id(\\d+)', deleteEvent);

// Update event status
router.patch('/:id(\\d+)/status', updateEventStatus);

// ==============================================
// ERROR HANDLING
// ==============================================

// 404 handler for undefined routes
router.use('*', (req, res) => {
  const requestId = req.id || 'no-request-id';
  console.log(`[${requestId}] 404: Route not found: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    status: 'error',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    requestId
  });
});

// Error handling middleware
router.use((err, req, res, next) => {
  const requestId = req.id || 'no-request-id';
  console.error(`[${requestId}] Error in event routes:`, {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });
  
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
    requestId
  });
});

export default router;
