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
    console.error(normalizeErr.stack);

    return res.status(500).json({
      message: fallbackMessage || 'Server error',
      error: fallbackMessage || 'Server error',
      code: 'INTERNAL_ERROR'
    });
  }

  if (appError.status === 500 && fallbackMessage) {
    appError.message = fallbackMessage;
  }

  // Detailed server-side logging
  console.error('\n========== API ERROR ==========');
  console.error(`Method:  ${res.req?.method}`);
  console.error(`URL:     ${res.req?.originalUrl || res.req?.url}`);
  console.error(`Code:    ${appError.code}`);
  console.error(`Status:  ${appError.status}`);
  console.error(`Message: ${appError.message}`);
  console.error(`Stack:\n${error?.stack || appError?.stack || 'No stack trace'}`);
  console.error('================================\n');

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