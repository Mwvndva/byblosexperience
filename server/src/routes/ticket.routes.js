import express from 'express';
import { protect } from '../middleware/auth.js';
import TicketController from '../controllers/ticket.controller.js';
import { sendTicketEmail } from '../controllers/ticketController.js';

const router = express.Router();

// Public endpoints (no authentication required)
router.post('/send-confirmation', sendTicketEmail);

// Ticket validation endpoint - handles both GET and POST requests
router.get('/validate/:ticketNumber', (req, res, next) => {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Process the validation request
  TicketController.validateTicket(req, res, next);
});

// Also support POST requests for validation (useful for some QR code scanners)
router.post('/validate/:ticketNumber', TicketController.validateTicket);

// Protected endpoints (require authentication)
const protectedRouter = express.Router();
protectedRouter.use(protect);

// Get all tickets for an organizer
protectedRouter.get('/', TicketController.getTickets);

// Get tickets for a specific event
protectedRouter.get('/events/:eventId', TicketController.getTickets);

// Get ticket statistics
protectedRouter.get('/stats', TicketController.getTicketStats);

// Create a new ticket
protectedRouter.post('/events/:eventId', TicketController.createTicket);

// Get a specific ticket
protectedRouter.get('/:ticketId', TicketController.getTicket);

// Update ticket status
protectedRouter.patch('/:ticketId/status', TicketController.updateTicketStatus);

// Send ticket email (admin use)
protectedRouter.post('/send-email', sendTicketEmail);

// Mount protected routes under /api/organizers/tickets
router.use(protectedRouter);

export default router;
