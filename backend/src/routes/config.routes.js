import express from 'express';
import { getConfig, updateConfig } from '../controllers/config.controller.js';
import { optionalAuth, authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/authorize.js';

const router = express.Router();

router.get('/', optionalAuth, getConfig);
router.put('/', authenticate, requireAdmin, updateConfig);

export default router;
