function sendError(res, error, fallbackMessage = 'Server error') {
  console.error(error);
  const status = error.status || 500;
  const message = status === 500 ? fallbackMessage : error.message;
  return res.status(status).json({ message, error: message });
}

module.exports = {
  sendError
};
