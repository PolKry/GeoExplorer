const {
  normalizeError,
  serializeErrorForResponse,
  AuthError,
  ValidationError,
  NotFoundError
} = require('../utils/app-error.utils');

/**
 * Send error response to client
 * Maintains backward compatibility with { message, error } format
 * Adds error code for better client-side handling
 */
function sendError(res, error, fallbackMessage = 'Server error') {
  let appError;

  try {
    appError = normalizeError(error);
  } catch (normalizeErr) {
    console.error('Error during error normalization:', normalizeErr);
    return res.status(500).json({
      message: fallbackMessage || 'Server error',
      error: fallbackMessage || 'Server error',
      code: 'INTERNAL_ERROR'
    });
  }

  // Use fallback message only for 500 errors
  if (appError.status === 500 && fallbackMessage) {
    appError.message = fallbackMessage;
  }

  console.error(`[${appError.code}] ${appError.status}: ${appError.message}`);

  // Maintain backward compatibility with frontend
  return res.status(appError.status).json({
    message: appError.message,
    error: appError.message,
    code: appError.code,
    ...(appError.details && { details: appError.details })
  });
}

/**
 * Send authentication error
 */
function sendAuthError(res, error, fallbackMessage = 'Authentication failed') {
  const authError = error instanceof AuthError
    ? error
    : new AuthError(error?.message || fallbackMessage);

  return sendError(res, authError, fallbackMessage);
}

/**
 * Send validation error
 */
function sendValidationError(res, error, fallbackMessage = 'Invalid request') {
  const validationError = error instanceof ValidationError
    ? error
    : new ValidationError(error?.message || fallbackMessage);

  return sendError(res, validationError, fallbackMessage);
}

/**
 * Send not found error
 */
function sendNotFoundError(res, error, fallbackMessage = 'Resource not found') {
  const notFoundError = error instanceof NotFoundError
    ? error
    : new NotFoundError(error?.message || fallbackMessage);

  return sendError(res, notFoundError, fallbackMessage);
}

module.exports = {
  sendError,
  sendAuthError,
  sendValidationError,
  sendNotFoundError
};