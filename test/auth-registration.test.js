const test = require('node:test');
const assert = require('node:assert/strict');

const jwt = require('jsonwebtoken');
const { normalizeRegistrationProfile, createPasswordResetToken, verifyPasswordResetToken } = require('../services/auth.service');

test('normalizes registration profile details', () => {
  const profile = normalizeRegistrationProfile({
    firstName: '  Alice  ',
    lastName: '  Smith ',
    country: { name: 'United States', code: 'US' },
    bio: '  Travel lover  '
  });

  assert.deepEqual(profile, {
    firstName: 'Alice',
    lastName: 'Smith',
    country: { name: 'United States', code: 'US' },
    bio: 'Travel lover'
  });
});

test('allows registration without a selected country', () => {
  const profile = normalizeRegistrationProfile({
    firstName: 'Alice',
    lastName: 'Smith',
    bio: 'Travel lover'
  });

  assert.deepEqual(profile, {
    firstName: 'Alice',
    lastName: 'Smith',
    country: { name: '', code: '' },
    bio: 'Travel lover'
  });
});

test('creates and verifies a password reset token for the right user', () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  const token = createPasswordResetToken('user-123');
  const payload = verifyPasswordResetToken(token);

  assert.equal(payload.userId, 'user-123');
  assert.equal(payload.purpose, 'password_reset');
  assert.ok(payload.exp > Date.now() / 1000);
});
