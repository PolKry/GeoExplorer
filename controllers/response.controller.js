function sendError(res, error, fallbackMessage = 'Server error') {
  console.error(error);

  const status = error && typeof error === 'object' && Number.isInteger(error.status)
    ? error.status
    : 500;

  const message = status === 500
    ? (fallbackMessage || 'Server error')
    : (error && error.message ? error.message : fallbackMessage || 'Server error');

  return res.status(status).json({ message, error: message });
}

function sendAuthError(res, error, fallbackMessage = 'Authentication failed') {
  return sendError(res, { ...error, status: 401 }, fallbackMessage);
}

function sendValidationError(res, error, fallbackMessage = 'Invalid request') {
  return sendError(res, { ...error, status: 400 }, fallbackMessage);
}

module.exports = {
  sendError,
  sendAuthError,
  sendValidationError
};
