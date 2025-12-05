import { ApiResponse } from '../utils/apiResponse.js';

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json(
    ApiResponse.error(`Route ${req.method} ${req.path} not found`)
  );
};
