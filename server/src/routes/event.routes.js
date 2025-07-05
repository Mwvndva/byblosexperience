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
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Public routes - these don't require authentication
// 1. Specific static routes first
router.get('/public/upcoming', (req, res, next) => {
  console.log('GET /public/upcoming route hit');
  console.log('Query params:', req.query);
  next();
}, getUpcomingEvents);

// 2. Specific parameterized routes next
router.get('/public/:eventId(\\d+)/ticket-types', (req, res, next) => {
  console.log(`GET /public/${req.params.eventId}/ticket-types route hit`);
  next();
}, getEventTicketTypes);

router.get('/public/:eventId(\\d+)', (req, res, next) => {
  console.log(`GET /public/${req.params.eventId} route hit`);
  next();
}, getPublicEvent);

// 3. Catch-all for invalid public event IDs
router.get('/public/:eventId([^0-9]+)', (req, res) => {
  console.log(`Invalid event ID format: ${req.params.eventId}`);
  res.status(404).json({
    status: 'error',
    message: 'Event not found. Event ID must be a number.'
  });
});

// Protected routes (require organizer authentication)
router.use(protect);

// Organizer event routes
router.post('/', createEvent);
router.get('/', getOrganizerEvents);
router.get('/dashboard', getDashboardEvents);
router.get('/:id', getEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);
router.patch('/:id/status', updateEventStatus);

// 404 handler for undefined routes
router.use('*', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

export default router;
