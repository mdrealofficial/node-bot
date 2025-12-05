import express from 'express';
import { getAllForms, createForm, submitForm } from '../controllers/form.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getAllForms);
router.post('/', authenticate, createForm);
router.post('/:formId/submit', optionalAuth, submitForm);

export default router;
