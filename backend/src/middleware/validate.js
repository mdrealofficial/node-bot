import { ValidationError } from '../utils/apiResponse.js';
import { validateRequest } from '../utils/validation.js';

/**
 * Validation middleware factory
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const { isValid, errors } = validateRequest(req.body, schema);

    if (!isValid) {
      return next(new ValidationError('Validation failed', errors));
    }

    next();
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { isValid, errors } = validateRequest(req.query, schema);

    if (!isValid) {
      return next(new ValidationError('Invalid query parameters', errors));
    }

    next();
  };
};

/**
 * Validate URL parameters
 */
export const validateParams = (schema) => {
  return (req, res, next) => {
    const { isValid, errors } = validateRequest(req.params, schema);

    if (!isValid) {
      return next(new ValidationError('Invalid URL parameters', errors));
    }

    next();
  };
};
