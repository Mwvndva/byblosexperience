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

// Public routes - these don't require authentication
// Define specific routes before parameterized routes to avoid conflicts
router.get('/public/upcoming', (req, res, next) => {
  console.log('GET /public/upcoming route hit');
  console.log('Query params:', req.query);
  next();
}, getUpcomingEvents);

// Add a route to handle non-numeric event IDs with a 404
router.get('/public/:eventId([^0-9]+)', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Event not found. Event ID must be a number.'
  });
});

// Route for numeric event IDs
router.get('/public/:eventId(\\d+)/ticket-types', getEventTicketTypes);
router.get('/public/:eventId(\\d+)', getPublicEvent);

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

// Add a catch-all route for 404 errors
router.use('*', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

export default router;
