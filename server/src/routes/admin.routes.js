import express from 'express';
import {
  adminLogin,
  protect,
  getDashboardStats,
  getAllSellers,
  getSellerById,
  updateSellerStatus,
  getAllOrganizers,
  getOrganizerById,
  updateOrganizerStatus,
  getAllEvents,
  getEventById,
  updateEventStatus,
  getEventTickets,
  getAllProducts,
  getSellerProducts
} from '../controllers/admin.controller.js';

const router = express.Router();

// Admin login route (public)
router.post('/login', adminLogin);

// Protected admin routes (require authentication)
router.use(protect);

// Dashboard data
router.get('/dashboard', getDashboardStats);

// Sellers management
router.get('/sellers', getAllSellers);
router.get('/sellers/:id', getSellerById);
router.patch('/sellers/:id/status', updateSellerStatus);

// Organizers management
router.get('/organizers', getAllOrganizers);
router.get('/organizers/:id', getOrganizerById);
router.patch('/organizers/:id/status', updateOrganizerStatus);

// Events management
router.get('/events', getAllEvents);
router.get('/events/:id', getEventById);
router.get('/events/:id/tickets', getEventTickets);
router.patch('/events/:id/status', updateEventStatus);

// Products management
router.get('/products', getAllProducts);
router.get('/sellers/:sellerId/products', getSellerProducts);

export default router;
