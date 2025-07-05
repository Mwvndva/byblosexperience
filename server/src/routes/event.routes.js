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
const publicRouter = express.Router();
const protectedRouter = express.Router();

// Public routes
publicRouter.get('/upcoming', getUpcomingEvents);
publicRouter.get('/:eventId', getPublicEvent);
publicRouter.get('/:eventId/ticket-types', getEventTicketTypes);

// Protected routes (require organizer authentication)
protectedRouter.use(protect);

// Organizer event routes
protectedRouter.post('/', createEvent);
protectedRouter.get('/', getOrganizerEvents);
protectedRouter.get('/dashboard', getDashboardEvents);
protectedRouter.get('/:id', getEvent);
protectedRouter.put('/:id', updateEvent);
protectedRouter.delete('/:id', deleteEvent);
protectedRouter.patch('/:id/status', updateEventStatus);

// Mount public and protected routes
router.use('/public', publicRouter);
router.use('/', protectedRouter);

// Add a catch-all route for 404 errors
router.use('*', (req, res) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

export default router;
