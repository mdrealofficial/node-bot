import express from 'express';
import { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuth, getAllCategories);
router.get('/:categoryId', optionalAuth, getCategoryById);
router.post('/', authenticate, createCategory);
router.put('/:categoryId', authenticate, updateCategory);
router.delete('/:categoryId', authenticate, deleteCategory);

export default router;
