const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ message: 'No token, authorization denied.' });

  const token = authHeader.split(' ')[1];

  try {
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId };
    next();
  } catch (err) {
    console.error('JWT error:', err);
    res.status(401).json({ message: 'Invalid token.' });
  }
}

module.exports = auth;