import { showMessage } from '../../utils/toast.js';

const form = document.getElementById('forgot-password-form');

async function requestPasswordReset(email) {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to request a password reset.');
  }

  return data;
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email')?.value.trim();
    if (!email) {
      showMessage('Please enter your email address.', 'error');
      return;
    }

    try {
      await requestPasswordReset(email);
      showMessage('If an account with that email exists, a reset link has been sent.', 'success');
      form.reset();
    } catch (error) {
      showMessage(error.message || 'Could not send the reset email.', 'error');
    }
  });
}
