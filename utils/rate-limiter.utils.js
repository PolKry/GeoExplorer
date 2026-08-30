const rateLimit = require('express-rate-limit');

// Limit pro registraci - např. max 5 pokusů za 15 minut z jedné IP
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 5,
  message: { message: 'Too many registration attempts from this IP, please try again after 15 minutes.' }
});

// Limit pro ověřování emailu - např. max 10 pokusů za 15 minut z jedné IP
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minut
  max: 10,
  message: 'Too many email verification attempts from this IP, please try again after 15 minutes.'
});

module.exports = {
  registerLimiter,
  verifyLimiter
};