/**
 * Socket.IO Error Handling Utilities
 * Provides wrappers for handling async errors in Socket.IO event handlers
 */

const { normalizeError } = require('./app-error.utils');

/**
 * Wraps a Socket.IO async event handler to catch errors
 * Provides consistent error handling with callback-based response
 * 
 * Usage:
 *   socket.on('some-event', socketAsyncHandler(async (data) => {
 *     // your async code
 *   }));
 */
function socketAsyncHandler(handler) {
  return async (data, callback) => {
    try {
      // If handler needs callback (has 2+ parameters), pass it
      if (handler.length > 1) {
        await handler(data, callback);
      } else {
        // Otherwise just handle the data
        await handler(data);
      }
    } catch (error) {
      console.error('[SOCKET_ERROR]', error);
      
      const appError = normalizeError(error);
      
      // If callback provided, send error through it
      if (callback && typeof callback === 'function') {
        callback({
          error: true,
          message: appError.message,
          code: appError.code,
          status: appError.status
        });
      } else {
        // If no callback, log but don't crash
        console.error('[SOCKET_ERROR_NO_CALLBACK]', {
          message: appError.message,
          code: appError.code,
          status: appError.status
        });
      }
    }
  };
}

/**
 * Wraps a Socket.IO event handler that doesn't use callbacks
 * Just prevents errors from crashing the connection
 */
function socketEventHandler(handler) {
  return async (data) => {
    try {
      await handler(data);
    } catch (error) {
      console.error('[SOCKET_ERROR]', error);
      // Error is logged but not communicated to client
      // For events without callbacks, there's no way to send response
    }
  };
}

module.exports = {
  socketAsyncHandler,
  socketEventHandler
};
