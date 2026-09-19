import { PAGES } from '../../constants/resources.js';
import { showMessage } from '../../utils/toast.js';

const form = document.getElementById('reset-password-form');

function getTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token');
}

async function resetPassword(token, password) {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to reset password.');
  }

  return data;
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const password = document.getElementById('password')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const token = getTokenFromUrl();

    if (!token) {
      showMessage('Missing or invalid reset link.', 'error');
      return;
    }

    if (!password || password.length < 8) {
      showMessage('Password must be at least 8 characters.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showMessage('Passwords do not match.', 'error');
      return;
    }

    try {
      await resetPassword(token, password);
      showMessage('Password updated successfully. You can now log in.', 'success');
      form.reset();
      setTimeout(() => {
        window.location.replace(PAGES.login);
      }, 1800);
    } catch (error) {
      showMessage(error.message || 'Could not update the password.', 'error');
    }
  });
}
