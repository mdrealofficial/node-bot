import validator from 'validator';

/**
 * Validate email format
 */
export const validateEmail = (email) => {
  return validator.isEmail(email);
};

/**
 * Validate phone number (basic validation)
 */
export const validatePhone = (phone) => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a valid length (10-15 digits)
  return cleaned.length >= 10 && cleaned.length <= 15;
};

/**
 * Sanitize string input
 */
export const sanitizeString = (str) => {
  return validator.trim(validator.escape(str));
};

/**
 * Validate URL format
 */
export const validateUrl = (url) => {
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true,
  });
};

/**
 * Validate UUID format
 */
export const validateUUID = (uuid) => {
  return validator.isUUID(uuid);
};

/**
 * Validate request body against schema
 */
export const validateRequest = (data, schema) => {
  const errors = {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // Required validation
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${field} is required`;
      continue;
    }

    // Skip further validation if field is not required and not provided
    if (!rules.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Type validation
    if (rules.type) {
      switch (rules.type) {
        case 'email':
          if (!validateEmail(value)) {
            errors[field] = `${field} must be a valid email`;
          }
          break;
        case 'phone':
          if (!validatePhone(value)) {
            errors[field] = `${field} must be a valid phone number`;
          }
          break;
        case 'url':
          if (!validateUrl(value)) {
            errors[field] = `${field} must be a valid URL`;
          }
          break;
        case 'uuid':
          if (!validateUUID(value)) {
            errors[field] = `${field} must be a valid UUID`;
          }
          break;
        case 'string':
          if (typeof value !== 'string') {
            errors[field] = `${field} must be a string`;
          }
          break;
        case 'number':
          if (typeof value !== 'number' && isNaN(Number(value))) {
            errors[field] = `${field} must be a number`;
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors[field] = `${field} must be a boolean`;
          }
          break;
      }
    }

    // Min length validation
    if (rules.minLength && value.length < rules.minLength) {
      errors[field] = `${field} must be at least ${rules.minLength} characters`;
    }

    // Max length validation
    if (rules.maxLength && value.length > rules.maxLength) {
      errors[field] = `${field} must not exceed ${rules.maxLength} characters`;
    }

    // Min value validation
    if (rules.min !== undefined && Number(value) < rules.min) {
      errors[field] = `${field} must be at least ${rules.min}`;
    }

    // Max value validation
    if (rules.max !== undefined && Number(value) > rules.max) {
      errors[field] = `${field} must not exceed ${rules.max}`;
    }

    // Custom validation
    if (rules.custom && typeof rules.custom === 'function') {
      const customError = rules.custom(value);
      if (customError) {
        errors[field] = customError;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
