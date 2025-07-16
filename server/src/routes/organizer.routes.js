import express from 'express';
import { 
  register, 
  login, 
  getCurrentUser,
  updateProfile,
  updatePassword
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no authentication required)
router.post('/register', register);
router.post('/login', login);

// Protected routes (authentication required)
router.get('/me', protect, getCurrentUser);
router.patch('/update-profile', protect, updateProfile);
router.patch('/update-password', protect, updatePassword);

export default router;
