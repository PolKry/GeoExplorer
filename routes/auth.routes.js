const express = require('express');

const authController = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');
const { registerLimiter, verifyLimiter } = require('../utils/rate-limiter.utils');

const router = express.Router();

router.post('/register', registerLimiter, authController.register);
router.post('/login', authController.login);
router.post('/google', authController.loginWithGoogle);
router.get('/google-client-id', authController.googleClientId);
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);
router.get('/verify-email', verifyLimiter, authController.verifyEmail);
router.get('/me', auth, authController.me);
router.delete('/delete', auth, authController.deleteAccount);
router.put('/update-account', auth, authController.updateAccount);
router.post('/api/validate-token', auth, authController.validateToken);

module.exports = router;
