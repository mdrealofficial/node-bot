import express from 'express';
import { getAllOrders, getOrderById, createOrder, updateOrder, deleteOrder } from '../controllers/order.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getAllOrders);
router.get('/:orderId', authenticate, getOrderById);
router.post('/', authenticate, createOrder);
router.put('/:orderId', authenticate, updateOrder);
router.delete('/:orderId', authenticate, deleteOrder);

export default router;
