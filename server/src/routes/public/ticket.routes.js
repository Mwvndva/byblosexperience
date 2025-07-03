import express from 'express';
import { purchaseTickets, getEventTicketTypes, verifyPaystackAndPurchase } from '../../controllers/public/ticket.controller.js';

const router = express.Router();

// Get ticket types for an event (public)
router.get('/events/:eventId/ticket-types', getEventTicketTypes);

// Purchase tickets (public)
router.post('/tickets/purchase', purchaseTickets);

// Purchase tickets with Paystack (public)
router.post('/tickets/paystack', verifyPaystackAndPurchase);

export default router;
