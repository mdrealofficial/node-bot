import express from 'express';
import { getAllStores, getStoreById, getStoreBySlug, createStore, updateStore, deleteStore } from '../controllers/store.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuth, getAllStores);
router.get('/slug/:slug', optionalAuth, getStoreBySlug);
router.get('/:storeId', optionalAuth, getStoreById);
router.post('/', authenticate, createStore);
router.put('/:storeId', authenticate, updateStore);
router.delete('/:storeId', authenticate, deleteStore);

export default router;
