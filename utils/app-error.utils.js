/**
 * Application Error Utilities
 * Centralized error handling and normalization
 */

/**
 * Base application error class
 * Provides consistent error structure across the app
 */
class AppError extends Error {
  constructor(message, status = 500, code = 'INTERNAL_ERROR', options = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = options.details || undefined;
    this.cause = options.cause || undefined;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Validation error (400)
 */
class ValidationError extends AppError {
  constructor(message, options = {}) {
    super(message, 400, 'VALIDATION_ERROR', options);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Authentication error (401)
 */
class AuthError extends AppError {
  constructor(message = 'Authentication failed', options = {}) {
    super(message, 401, 'AUTHENTICATION_ERROR', options);
    this.name = 'AuthError';
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

/**
 * Authorization error (403)
 */
class ForbiddenError extends AppError {
  constructor(message = 'Access denied', options = {}) {
    super(message, 403, 'FORBIDDEN', options);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Not found error (404)
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found', options = {}) {
    super(message, 404, 'NOT_FOUND', options);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Conflict error (409)
 * Used for duplicate resources, invalid state transitions, etc.
 */
class ConflictError extends AppError {
  constructor(message = 'Conflict', options = {}) {
    super(message, 409, 'CONFLICT', options);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Unprocessable entity error (422)
 * Similar to validation but for semantic errors
 */
class UnprocessableError extends AppError {
  constructor(message = 'Unprocessable entity', options = {}) {
    super(message, 422, 'UNPROCESSABLE_ENTITY', options);
    this.name = 'UnprocessableError';
    Object.setPrototypeOf(this, UnprocessableError.prototype);
  }
}

/**
 * Too many requests error (429)
 */
class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', options = {}) {
    super(message, 429, 'TOO_MANY_REQUESTS', options);
    this.name = 'TooManyRequestsError';
    Object.setPrototypeOf(this, TooManyRequestsError.prototype);
  }
}

/**
 * Database error (500)
 */
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', options = {}) {
    super(message, 500, 'DATABASE_ERROR', options);
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Bad gateway error (502)
 */
class BadGatewayError extends AppError {
  constructor(message = 'Bad gateway', options = {}) {
    super(message, 502, 'BAD_GATEWAY', options);
    this.name = 'BadGatewayError';
    Object.setPrototypeOf(this, BadGatewayError.prototype);
  }
}

/**
 * Service unavailable error (503)
 */
class ServiceUnavailableError extends AppError {
  constructor(message = 'Service unavailable', options = {}) {
    super(message, 503, 'SERVICE_UNAVAILABLE', options);
    this.name = 'ServiceUnavailableError';
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/**
 * Gateway timeout error (504)
 */
class GatewayTimeoutError extends AppError {
  constructor(message = 'Gateway timeout', options = {}) {
    super(message, 504, 'GATEWAY_TIMEOUT', options);
    this.name = 'GatewayTimeoutError';
    Object.setPrototypeOf(this, GatewayTimeoutError.prototype);
  }
}

/**
 * Normalizes any thrown value into a proper AppError
 * Handles:
 * - AppError instances (pass through)
 * - Native Error objects (convert to AppError)
 * - Plain objects with status/message (convert to AppError)
 * - Any other value (wrap in AppError)
 */
function normalizeError(error) {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Native Error or subclass
  if (error instanceof Error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    const code = error.code || 'INTERNAL_ERROR';
    const appError = new AppError(error.message, status, code, {
      cause: error
    });
    return appError;
  }

  // Plain object with error properties
  if (typeof error === 'object' && error !== null) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    const code = error.code || 'INTERNAL_ERROR';
    const message = error.message || 'An error occurred';
    const appError = new AppError(message, status, code, {
      details: error.details,
      cause: error
    });
    return appError;
  }

  // String or unknown value
  const message = typeof error === 'string' ? error : 'An unknown error occurred';
  return new AppError(message, 500, 'INTERNAL_ERROR');
}

/**
 * Safely extracts error properties without using spread operator
 * Returns object safe to send to client (no stack traces, internals, etc.)
 */
function serializeErrorForResponse(error) {
  const normalized = normalizeError(error);
  
  return {
    message: normalized.message,
    code: normalized.code,
    ...(normalized.details && { details: normalized.details })
  };
}

/**
 * Safe error extraction for logging (can include more details)
 */
function serializeErrorForLogging(error) {
  const normalized = normalizeError(error);
  
  return {
    message: normalized.message,
    code: normalized.code,
    status: normalized.status,
    stack: normalized.stack,
    cause: normalized.cause ? serializeErrorForLogging(normalized.cause) : undefined,
    details: normalized.details
  };
}

/**
 * Translate Mongoose/MongoDB errors to AppError
 */
function translateMongooseError(error) {
  // Validation error
  if (error.name === 'ValidationError') {
    const details = Object.keys(error.errors).reduce((acc, field) => {
      acc[field] = error.errors[field].message;
      return acc;
    }, {});
    return new ValidationError('Validation failed', { details });
  }

  // Duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return new ConflictError(`${field} already exists`);
  }

  // Cast error (invalid ObjectId, etc.)
  if (error.name === 'CastError') {
    return new ValidationError(`Invalid ${error.kind}: ${error.value}`);
  }

  // Generic database error
  return new DatabaseError('Database operation failed', { cause: error });
}

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  UnprocessableError,
  TooManyRequestsError,
  DatabaseError,
  BadGatewayError,
  ServiceUnavailableError,
  GatewayTimeoutError,

  // Utilities
  normalizeError,
  serializeErrorForResponse,
  serializeErrorForLogging,
  translateMongooseError
};
