import express from 'express';
import { register, login, refresh, logout, getMe, updatePassword, forgotPassword } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Validation schemas
const registerSchema = {
  email: { required: true, type: 'email' },
  password: { required: true, minLength: 8 },
  fullName: { required: true, minLength: 2 },
};

const loginSchema = {
  email: { required: true, type: 'email' },
  password: { required: true },
};

const refreshSchema = {
  refreshToken: { required: true },
};

const updatePasswordSchema = {
  currentPassword: { required: true },
  newPassword: { required: true, minLength: 8 },
};

const forgotPasswordSchema = {
  email: { required: true, type: 'email' },
};

// Routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.put('/password', authenticate, validate(updatePasswordSchema), updatePassword);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);

export default router;
