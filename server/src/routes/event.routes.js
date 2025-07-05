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
router.get('/public/upcoming', getUpcomingEvents);
router.get('/public/:eventId/ticket-types', getEventTicketTypes);
router.get('/public/:eventId', getPublicEvent);

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
