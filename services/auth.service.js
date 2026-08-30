const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userRepository = require('../repositories/user.repository');
const { sendEmail } = require('../utils/email-sender.utils');

function validateRequired(value, message) {
  if (!value) {
    const error = new Error(message);
    error.status = 400;
    throw error;
  }
}

function validateLength(value, min, max, fieldName) {
  if (value.length < Number(min)) {
    const error = new Error(`${fieldName} must be at least ${min} characters`);
    error.status = 400;
    throw error;
  }

  if (value.length > Number(max)) {
    const error = new Error(`${fieldName} must not exceed ${max} characters`);
    error.status = 400;
    throw error;
  }
}

function signVerificationToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
}

function buildVerificationEmail(username, verificationLink) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Welcome to GeoExplorer</title>
      </head>
      <body style="font-family: Arial, sans-serif; background: #203a43; padding: 30px; margin: 0;">
        <div style="max-width: 500px; margin: auto; background: #1e1e1e; padding: 30px; border-radius: 12px; box-shadow: 0 0 15px rgba(0, 255, 174, 0.5); color: #fff; text-align: center;">
          <img src="${process.env.BASE_URL}/Resources/Images/Icon.png" alt="GeoExplorer Logo" style="width: 60px; margin-bottom: 20px;">
          <h2 style="color: #00ffae; margin-bottom: 10px;">Welcome, ${username}!</h2>
          <p style="font-size: 1.1em; margin-bottom: 20px;">Thanks for registering to <strong>GeoExplorer</strong>.</p>
          <p style="margin-bottom: 30px;">Explore the world and challenge your knowledge!</p>
          <a href="${verificationLink}" target="_blank" style="text-decoration: none;">
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
              <tr>
                <td style="background-color: #00ffae; padding: 15px 30px; border-radius: 8px; box-shadow: 0 0 10px #00ffae; text-align: center;">
                  <span style="color: #000; font-weight: bold; font-size: 16px; text-decoration: none; display: inline-block;">Verify Your Email</span>
                </td>
              </tr>
            </table>
          </a>
          <hr style="margin: 30px 0; border-color: #336253;">
          <p style="font-size: 0.85em; color: #aaa;">If you did not register, please ignore this email.</p>
          <p style="font-size: 0.75em; color: #555; margin-top: 40px;">© 2025 GeoExplorer. Created by Kryštof Polák.</p>
        </div>
      </body>
    </html>
  `;
}

async function register({ email, username, password }) {
  validateRequired(email, 'Email is required');
  validateRequired(password, 'Password is required');
  validateLength(password, process.env.MIN_PASSWORD_LENGHT, process.env.MAX_PASSWORD_LENGHT, 'Password');
  validateRequired(username, 'Username is required');
  validateLength(username, process.env.MIN_USERNAME_LENGHT, process.env.MAX_USERNAME_LENGHT, 'Username');

  const session = await userRepository.startSession();
  session.startTransaction();

  try {
    const existingUser = await userRepository.findUserByEmail(email, { session });
    if (existingUser) {
      const error = new Error('Email already in use');
      error.status = 400;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userRepository.createUserAccount({
      email,
      username,
      password: hashedPassword,
      createdAt: new Date(),
      role: 'user',
      isVerified: false
    }, session);

    await session.commitTransaction();
    session.endSession();

    const token = signVerificationToken(user._id);
    const verificationLink = `${process.env.BASE_URL}/api/auth/verify-email?token=${token}`;
    await sendEmail(email, 'Welcome to GeoExplorer!', buildVerificationEmail(username, verificationLink));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

async function login({ email, password }) {
  const user = await userRepository.findUserByEmail(email, { includePassword: true });
  if (!user) {
    const error = new Error('Invalid credentials');
    error.status = 400;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error('Invalid credentials');
    error.status = 400;
    throw error;
  }

  if (!user.isVerified) {
    const error = new Error('Verify your email first');
    error.status = 403;
    throw error;
  }

  return {
    token: jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' }),
    username: user.username
  };
}

async function verifyEmail(token) {
  validateRequired(token, 'Missing verification token.');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    const error = new Error('Invalid or expired verification token.');
    error.status = 400;
    throw error;
  }

  const user = await userRepository.findUserById(payload.userId);
  if (!user) {
    const error = new Error('User not found.');
    error.status = 400;
    throw error;
  }

  if (user.isVerified) {
    return { alreadyVerified: true };
  }

  user.isVerified = true;
  await user.save();
  return { alreadyVerified: false };
}

async function getMe(userId) {
  const user = await userRepository.findUserById(userId, { excludePassword: true });
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  return user;
}

async function deleteAccount(userId) {
  const user = await userRepository.deleteUserById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
}

async function updateAccount(userId, { username, newPassword, currentPassword }) {
  let profileChanged = false;
  const user = await userRepository.findUserById(userId, { includePassword: true });

  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  if (newPassword) {
    validateRequired(currentPassword, 'Current password required to set a new password');
    validateLength(newPassword, process.env.MIN_PASSWORD_LENGHT, process.env.MAX_PASSWORD_LENGHT, 'New password');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      const error = new Error('Current password is incorrect');
      error.status = 400;
      throw error;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    profileChanged = true;
  }

  if (username && username !== user.username) {
    validateLength(username, process.env.MIN_USERNAME_LENGHT, process.env.MAX_USERNAME_LENGHT, 'New username');
    user.username = username;
    profileChanged = true;
  }

  await user.save();

  if (!profileChanged) return { changed: false };
  return { changed: true, user: { username: user.username } };
}

module.exports = {
  register,
  login,
  verifyEmail,
  getMe,
  deleteAccount,
  updateAccount
};
