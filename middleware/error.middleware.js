/**
 * Express Error Handler Middleware
 * Centralized error handling for all Express errors
 * Must be registered AFTER all routes
 */

const { normalizeError, serializeErrorForLogging } = require('../utils/app-error.utils');

/**
 * Express error handler middleware
 * Catches all errors from routes and passes them through
 */
function errorHandler(err, req, res, next) {
  const appError = normalizeError(err);

  // Log the error with full context for debugging
  const logContext = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    status: appError.status,
    code: appError.code,
    message: appError.message,
    userId: req.user?.userId,
    error: serializeErrorForLogging(appError)
  };

  // Log at appropriate level
  if (appError.status >= 500) {
    console.error('[SERVER_ERROR]', JSON.stringify(logContext, null, 2));
  } else {
    console.warn('[CLIENT_ERROR]', logContext.code, appError.status, appError.message);
  }

  // Send error response to client
  // Maintain backward compatibility with existing format
  return res.status(appError.status).json({
    message: appError.message,
    error: appError.message,
    code: appError.code,
    ...(appError.details && { details: appError.details })
  });
}

module.exports = errorHandler;
