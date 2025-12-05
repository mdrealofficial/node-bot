import express from 'express';
import { getAllCustomers, createCustomer, updateCustomer } from '../controllers/customer.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getAllCustomers);
router.post('/', authenticate, createCustomer);
router.put('/:customerId', authenticate, updateCustomer);

export default router;
