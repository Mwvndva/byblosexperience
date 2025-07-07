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

// 1. First, define the static route for upcoming events
router.get('/public/upcoming', (req, res, next) => {
  const requestId = req.id || 'no-request-id';
  console.log(`[${requestId}] GET /public/upcoming`);
  console.log(`[${requestId}] Query params:`, req.query);
  next();
}, getUpcomingEvents);

// 2. Then, define the ticket types route with UUID validation
router.get('/public/:eventId/ticket-types', (req, res, next) => {
  const { eventId } = req.params;
  const requestId = req.id || 'no-request-id';
  
  // Convert to number if it's a numeric string, otherwise keep as is (for UUIDs)
  req.params.eventId = isNaN(eventId) ? eventId : parseInt(eventId, 10);
  
  console.log(`[${requestId}] GET /public/${eventId}/ticket-types`);
  next();
}, getEventTicketTypes);

// 3. Then, define the specific event details route with UUID validation
router.get('/public/:eventId', (req, res, next) => {
  const { eventId } = req.params;
  const requestId = req.id || 'no-request-id';
  
  // Convert to number if it's a numeric string, otherwise keep as is (for UUIDs)
  req.params.eventId = isNaN(eventId) ? eventId : parseInt(eventId, 10);
  
  console.log(`[${requestId}] GET /public/${eventId}`);
  next();
}, getPublicEvent);

// 4. Finally, catch-all for invalid public routes
router.get('/public/*', (req, res) => {
  const requestId = req.id || 'no-request-id';
  const path = req.path.replace(/^\/public\//, '');
  
  console.log(`[${requestId}] Invalid public endpoint: /public/${path}`);
  
  // Special case for /public/upcoming with incorrect method
  if (path === 'upcoming') {
    return res.status(405).json({
      status: 'error',
      message: 'Method not allowed. Use GET /api/events/public/upcoming',
      requestId
    });
  }
  
  // For non-numeric paths that aren't 'upcoming'
  res.status(400).json({
    status: 'error',
    message: 'Invalid endpoint. Please provide a valid numeric event ID or use /public/upcoming for upcoming events.',
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
