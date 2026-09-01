const jwt = require('jsonwebtoken');
const { sendAuthError } = require('../controllers/response.controller');

function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer '))
    return sendAuthError(res, new Error('No token, authorization denied.'), 'No token, authorization denied.');

  const token = authHeader.split(' ')[1];

  try {
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId };
    next();
  } catch (err) {
    console.error('JWT error:', err);
    return sendAuthError(res, err, 'Invalid token.');
  }
}

module.exports = auth;