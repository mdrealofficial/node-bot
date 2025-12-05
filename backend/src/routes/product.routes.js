import express from 'express';
import { 
  getAllProducts, 
  getProductById, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} from '../controllers/product.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const createProductSchema = {
  storeId: { required: true, type: 'uuid' },
  name: { required: true, minLength: 1 },
  price: { required: true, type: 'number', min: 0 },
  stock: { type: 'number', min: 0 },
};

// Get all products (public or authenticated)
router.get('/', optionalAuth, getAllProducts);

// Get product by ID
router.get('/:productId', optionalAuth, getProductById);

// Create product (authenticated)
router.post('/', authenticate, validate(createProductSchema), createProduct);

// Update product (authenticated)
router.put('/:productId', authenticate, updateProduct);

// Delete product (authenticated)
router.delete('/:productId', authenticate, deleteProduct);

export default router;
