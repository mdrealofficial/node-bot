import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const errors = err.errors || null;

  // Don't leak error details in production
  const response = process.env.NODE_ENV === 'production' && statusCode === 500
    ? ApiResponse.error('Internal server error')
    : ApiResponse.error(message, errors);

  res.status(statusCode).json(response);
};
