const jwt = require('jsonwebtoken');

module.exports = (socket, next) => {
    try {
        const authHeader = socket.handshake.auth?.token
            ? `Bearer ${socket.handshake.auth.token}`
            : socket.handshake.headers?.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new Error('No token, authorization denied.'));
        }

        const token = authHeader.split(' ')[1];

        const { userId } = jwt.verify(token, process.env.JWT_SECRET);

        // Match Express behavior
        socket.user = { userId };

        next();
    } catch (err) {
        console.error('Socket JWT error:', err.message);
        next(new Error('Invalid token.'));
    }
};