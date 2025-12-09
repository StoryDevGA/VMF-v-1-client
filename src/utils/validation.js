/**
 * Validation Utilities
 *
 * Reusable validation functions for form inputs
 */

/**
 * Validate if a value is not empty
 * @param {any} value - The value to validate
 * @param {string} fieldName - The name of the field for error message
 * @returns {string|null} Error message or null if valid
 */
export const required = (value, fieldName = 'This field') => {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
    return `${fieldName} is required`
  }
  return null
}

/**
 * Validate email format
 * @param {string} value - The email to validate
 * @returns {string|null} Error message or null if valid
 */
export const email = (value) => {
  if (!value) return null

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(value)) {
    return 'Please enter a valid email address'
  }
  return null
}

/**
 * Validate phone number format
 * @param {string} value - The phone number to validate
 * @returns {string|null} Error message or null if valid
 */
export const phone = (value) => {
  if (!value) return null

  // Allow various formats: +1 (555) 123-4567, 555-123-4567, 5551234567, etc.
  const phoneRegex = /^[\d\s()+\-\.]+$/
  if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 10) {
    return 'Please enter a valid phone number'
  }
  return null
}

/**
 * Validate minimum length
 * @param {number} min - Minimum length
 * @returns {function} Validator function
 */
export const minLength = (min) => (value, fieldName = 'This field') => {
  if (!value) return null

  if (value.length < min) {
    return `${fieldName} must be at least ${min} characters`
  }
  return null
}

/**
 * Validate maximum length
 * @param {number} max - Maximum length
 * @returns {function} Validator function
 */
export const maxLength = (max) => (value, fieldName = 'This field') => {
  if (!value) return null

  if (value.length > max) {
    return `${fieldName} must be no more than ${max} characters`
  }
  return null
}

/**
 * Validate against a regex pattern
 * @param {RegExp} pattern - The regex pattern to match
 * @param {string} message - Error message if pattern doesn't match
 * @returns {function} Validator function
 */
export const pattern = (pattern, message = 'Invalid format') => (value) => {
  if (!value) return null

  if (!pattern.test(value)) {
    return message
  }
  return null
}

/**
 * Validate that value matches another field
 * @param {any} otherValue - The value to match against
 * @param {string} otherFieldName - Name of the other field for error message
 * @returns {function} Validator function
 */
export const matches = (otherValue, otherFieldName) => (value) => {
  if (value !== otherValue) {
    return `Must match ${otherFieldName}`
  }
  return null
}

/**
 * Validate number range
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {function} Validator function
 */
export const range = (min, max) => (value, fieldName = 'This field') => {
  if (value === null || value === undefined || value === '') return null

  const num = Number(value)
  if (isNaN(num)) {
    return `${fieldName} must be a number`
  }
  if (num < min || num > max) {
    return `${fieldName} must be between ${min} and ${max}`
  }
  return null
}

/**
 * Validate URL format
 * @param {string} value - The URL to validate
 * @returns {string|null} Error message or null if valid
 */
export const url = (value) => {
  if (!value) return null

  try {
    new URL(value)
    return null
  } catch {
    return 'Please enter a valid URL'
  }
}

/**
 * Compose multiple validators
 * @param {...function} validators - Validator functions to compose
 * @returns {function} Composed validator function
 */
export const compose = (...validators) => (value, fieldName) => {
  for (const validator of validators) {
    const error = validator(value, fieldName)
    if (error) return error
  }
  return null
}

/**
 * Validate an entire form object
 * @param {object} values - Form values object
 * @param {object} rules - Validation rules object with same keys as values
 * @returns {object} Errors object with same keys as values
 *
 * @example
 * const values = { email: 'test@example.com', name: 'John' }
 * const rules = {
 *   email: compose(required, email),
 *   name: required
 * }
 * const errors = validateForm(values, rules)
 */
export const validateForm = (values, rules) => {
  const errors = {}

  for (const [field, validator] of Object.entries(rules)) {
    if (typeof validator === 'function') {
      const error = validator(values[field], field)
      if (error) {
        errors[field] = error
      }
    }
  }

  return errors
}

/**
 * Validate a single field
 * @param {string} field - Field name
 * @param {any} value - Field value
 * @param {function|array} validator - Validator function or array of validators
 * @returns {string|null} Error message or null if valid
 */
export const validateField = (field, value, validator) => {
  if (Array.isArray(validator)) {
    return compose(...validator)(value, field)
  }
  return validator(value, field)
}

// Export default validation service
export default {
  required,
  email,
  phone,
  minLength,
  maxLength,
  pattern,
  matches,
  range,
  url,
  compose,
  validateForm,
  validateField,
}
