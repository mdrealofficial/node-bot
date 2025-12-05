import express from 'express';
import { getUserProfile, updateUserProfile, updateUserSettings, getAllUsers } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, requireOwnershipOrAdmin } from '../middleware/authorize.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, requireAdmin, getAllUsers);

// Get user profile
router.get('/:userId', authenticate, getUserProfile);

// Update user profile
router.put('/:userId', authenticate, requireOwnershipOrAdmin('userId'), updateUserProfile);

// Update user settings
router.put('/:userId/settings', authenticate, requireOwnershipOrAdmin('userId'), updateUserSettings);

export default router;
