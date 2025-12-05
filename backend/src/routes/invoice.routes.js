import express from 'express';
import { getAllInvoices, createInvoice } from '../controllers/invoice.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getAllInvoices);
router.post('/', authenticate, createInvoice);

export default router;
