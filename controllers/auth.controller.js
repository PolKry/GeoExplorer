const authService = require('../services/auth.service');
const { sendError } = require('./response.controller');

async function register(req, res) {
  try {
    await authService.register(req.body);
    res.status(201).json({ message: 'User registered. Check your email to verify your account.' });
  } catch (error) {
    sendError(res, error, 'Registration failed');
  }
}

async function login(req, res) {
  try {
    res.json(await authService.login(req.body));
  } catch (error) {
    sendError(res, error, 'Login failed');
  }
}

async function verifyEmail(req, res) {
  try {
    const result = await authService.verifyEmail(req.query.token);
    if (result.alreadyVerified) return res.send('Email is already verified.');
    return res.redirect('/menu/verify-success.html');
  } catch (error) {
    if (error.status) return res.status(error.status).send(error.message);
    console.error(error);
    return res.status(500).send('Server error.');
  }
}

async function me(req, res) {
  try {
    res.json(await authService.getMe(req.user.userId));
  } catch (error) {
    sendError(res, error, 'Failed to fetch user info');
  }
}

async function deleteAccount(req, res) {
  try {
    await authService.deleteAccount(req.user.userId);
    res.json({ message: 'Account successfully deleted' });
  } catch (error) {
    sendError(res, error, 'Failed to delete account');
  }
}

async function updateAccount(req, res) {
  try {
    const result = await authService.updateAccount(req.user.userId, req.body);
    if (!result.changed) return res.json({ message: 'No changes detected' });
    return res.json({ message: 'Account updated successfully', user: result.user });
  } catch (error) {
    sendError(res, error, 'Failed to update account');
  }
}

function validateToken(req, res) {
  res.json({ valid: true, user: req.user });
}

module.exports = {
  register,
  login,
  verifyEmail,
  me,
  deleteAccount,
  updateAccount,
  validateToken
};
