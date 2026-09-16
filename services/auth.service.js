const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const userRepository = require('../repositories/user.repository');
const { sendEmail } = require('../utils/email-sender.utils');
const { ValidationError, ForbiddenError, NotFoundError, ConflictError } = require('../utils/app-error.utils');

function validateRequired(value, message) {
  if (!value) {
    throw new ValidationError(message);
  }
}

function validateLength(value, min, max, fieldName) {
  if (value.length < Number(min)) {
    throw new ValidationError(`${fieldName} must be at least ${min} characters`);
  }

  if (value.length > Number(max)) {
    throw new ValidationError(`${fieldName} must not exceed ${max} characters`);
  }
}

function signVerificationToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
}

function createPasswordResetToken(userId) {
  return jwt.sign({ userId, purpose: 'password_reset' }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function createAuthResponse(user) {
  return {
    token: jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' }),
    username: user.username
  };
}

async function createGoogleUsername(email) {
  const localPart = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'player';

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = crypto.randomBytes(3).toString('hex');
    const username = `${localPart}_${suffix}`.slice(0, 14);
    if (!(await userRepository.findUserByUsername(username))) return username;
  }

  throw new ConflictError('Unable to create a unique username');
}

function verifyPasswordResetToken(token) {
  validateRequired(token, 'Missing password reset token.');

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose !== 'password_reset') {
      throw new ValidationError('Invalid password reset token.');
    }
    return payload;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError('Invalid or expired password reset token.');
  }
}

function normalizeRegistrationProfile({ firstName, lastName, country, bio } = {}) {
  const cleanFirstName = (firstName || '').trim();
  const cleanLastName = (lastName || '').trim();
  const cleanBio = (bio || '').trim();
  const normalizedCountry = country && (country.name || country.code)
    ? {
        name: (country.name || '').trim(),
        code: (country.code || '').trim()
      }
    : { name: '', code: '' };

  return {
    firstName: cleanFirstName,
    lastName: cleanLastName,
    country: normalizedCountry,
    bio: cleanBio || 'No bio yet. Add one to tell others more about yourself!'
  };
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
          <img src="${process.env.BASE_URL}/resources/images/Icon.png" alt="GeoExplorer Logo" style="width: 60px; margin-bottom: 20px;">
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

function buildPasswordResetEmail(username, resetLink) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Reset your GeoExplorer password</title>
      </head>
      <body style="font-family: Arial, sans-serif; background: #203a43; padding: 30px; margin: 0;">
        <div style="max-width: 500px; margin: auto; background: #1e1e1e; padding: 30px; border-radius: 12px; box-shadow: 0 0 15px rgba(0, 255, 174, 0.5); color: #fff; text-align: center;">
          <img src="${process.env.BASE_URL}/resources/images/Icon.png" alt="GeoExplorer Logo" style="width: 60px; margin-bottom: 20px;">
          <h2 style="color: #00ffae; margin-bottom: 10px;">Password reset</h2>
          <p style="font-size: 1.05em; margin-bottom: 18px;">Hi ${username},</p>
          <p style="margin-bottom: 28px;">We received a request to reset your GeoExplorer password.</p>
          <a href="${resetLink}" target="_blank" style="text-decoration: none;">
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
              <tr>
                <td style="background-color: #00ffae; padding: 15px 30px; border-radius: 8px; box-shadow: 0 0 10px #00ffae; text-align: center;">
                  <span style="color: #000; font-weight: bold; font-size: 16px; text-decoration: none; display: inline-block;">Reset Password</span>
                </td>
              </tr>
            </table>
          </a>
          <p style="font-size: 0.85em; color: #aaa; margin-top: 28px;">If you did not request this, you can safely ignore this email.</p>
        </div>
      </body>
    </html>
  `;
}

async function register({ email, username, password, firstName, lastName, country, bio }) {
  validateRequired(email, 'Email is required');
  validateRequired(password, 'Password is required');
  validateLength(password, process.env.MIN_PASSWORD_LENGHT, process.env.MAX_PASSWORD_LENGHT, 'Password');
  validateRequired(username, 'Username is required');
  validateLength(username, process.env.MIN_USERNAME_LENGHT, process.env.MAX_USERNAME_LENGHT, 'Username');

  const profileData = normalizeRegistrationProfile({ firstName, lastName, country, bio });

  const session = await userRepository.startSession();
  session.startTransaction();

  try {
    const existingUser = await userRepository.findUserByEmail(email, { session });
    if (existingUser) {
      throw new ConflictError('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userRepository.createUserAccount({
      email,
      username,
      password: hashedPassword,
      createdAt: new Date(),
      role: 'user',
      isVerified: false,
      profileData: {
        ...profileData,
        bio: profileData.bio
      }
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
    throw new ValidationError('Invalid credentials');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ValidationError('Invalid credentials');
  }

  if (!user.isVerified) {
    throw new ForbiddenError('Verify your email first');
  }

  return createAuthResponse(user);
}

async function loginWithGoogle(credential) {
  validateRequired(credential, 'Google credential is required');
  validateRequired(process.env.GOOGLE_CLIENT_ID, 'Google login is not configured');

  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    payload = ticket.getPayload();
  } catch (error) {
    throw new ValidationError('Invalid Google credential');
  }

  if (!payload?.email || !payload.email_verified) {
    throw new ValidationError('Google account email is not verified');
  }

  let user = await userRepository.findUserByEmail(payload.email);
  if (user) {
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }
    return createAuthResponse(user);
  }

  const username = await createGoogleUsername(payload.email);
  const password = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  user = await userRepository.createUserAccount({
    email: payload.email,
    username,
    password,
    createdAt: new Date(),
    role: 'user',
    isVerified: true,
    profileData: {
      firstName: payload.given_name || '',
      lastName: payload.family_name || '',
      bio: 'No bio yet. Add one to tell others more about yourself!'
    }
  });

  return createAuthResponse(user);
}

async function verifyEmail(token) {
  validateRequired(token, 'Missing verification token.');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw new ValidationError('Invalid or expired verification token.');
  }

  const user = await userRepository.findUserById(payload.userId);
  if (!user) {
    throw new NotFoundError('User not found.');
  }

  if (user.isVerified) {
    return { alreadyVerified: true };
  }

  user.isVerified = true;
  await user.save();
  return { alreadyVerified: false };
}

async function requestPasswordReset({ email }) {
  validateRequired(email, 'Email is required');

  const user = await userRepository.findUserByEmail(email);
  if (!user) {
    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  const token = createPasswordResetToken(user._id);
  const resetLink = `${process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`}/forgot-password-reset.html?token=${token}`;
  await sendEmail(user.email, 'Reset your GeoExplorer password', buildPasswordResetEmail(user.username || user.email, resetLink));

  return { message: 'If an account with that email exists, a reset link has been sent.' };
}

async function resetPassword({ token, password }) {
  const payload = verifyPasswordResetToken(token);
  validateRequired(password, 'New password is required');
  validateLength(password, process.env.MIN_PASSWORD_LENGHT, process.env.MAX_PASSWORD_LENGHT, 'Password');

  const user = await userRepository.findUserById(payload.userId, { includePassword: true });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  user.password = await bcrypt.hash(password, 10);
  await user.save();

  return { message: 'Password reset successfully.' };
}

async function getMe(userId) {
  const user = await userRepository.findUserById(userId, { excludePassword: true });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
}

async function deleteAccount(userId) {
  const user = await userRepository.deleteUserById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }
}

async function updateAccount(userId, { username, newPassword, currentPassword }) {
  let profileChanged = false;
  const user = await userRepository.findUserById(userId, { includePassword: true });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  if (newPassword) {
    validateRequired(currentPassword, 'Current password required to set a new password');
    validateLength(newPassword, process.env.MIN_PASSWORD_LENGHT, process.env.MAX_PASSWORD_LENGHT, 'New password');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new ValidationError('Current password is incorrect');
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
  loginWithGoogle,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  getMe,
  deleteAccount,
  updateAccount,
  normalizeRegistrationProfile,
  createPasswordResetToken,
  verifyPasswordResetToken
};
