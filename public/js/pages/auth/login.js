import {
  setToken,
  setUsername,
  getPendingProfile,
  removePendingProfile
} from "../../utils/storage.js";

import { loginUser } from "../../api/auth-api.js";
import { showMessage } from "../../utils/toast.js";
import { apiFetch } from "../../api/http.js";

async function loginWithGoogleCredential(credential) {
  const response = await apiFetch('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Google login failed');

  setToken(data.token);
  setUsername(data.username);
  await applyPendingProfile();
  window.location.href = '/index.html';
}

async function setupGoogleLogin() {
  const container = document.getElementById('google-login');
  if (!container) return;

  try {
    const configResponse = await fetch('/api/auth/google-client-id');
    if (!configResponse.ok) throw new Error('Google login configuration is unavailable.');
    const { clientId } = await configResponse.json();
    if (!clientId) throw new Error('Google login is not configured on the server.');

    console.info(`Google login origin: ${window.location.origin}`);

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          try {
            await loginWithGoogleCredential(credential);
          } catch (error) {
            showMessage(error.message || 'Google login failed', 'error');
          }
        }
      });
      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        width: 280,
        text: 'continue_with'
      });
    };
    script.onerror = () => showMessage('Unable to load Google login.', 'error');
    document.head.appendChild(script);
  } catch (error) {
    showMessage(error.message || 'Google login is unavailable.', 'error');
  }
}

async function applyPendingProfile() {
  const pendingProfile = getPendingProfile();
  if (!pendingProfile) return;

  try {
    const meResponse = await apiFetch('/api/auth/me');
    if (!meResponse.ok) throw new Error('Unable to load user profile');

    const me = await meResponse.json();
    const userId = me._id;

    if (pendingProfile.country?.name && pendingProfile.country?.code) {
      await apiFetch(`/api/users/${userId}/country`, {
        method: 'PUT',
        body: JSON.stringify(pendingProfile.country)
      });
    }

    if (pendingProfile.bio) {
      await apiFetch(`/api/users/${userId}/bio`, {
        method: 'PUT',
        body: JSON.stringify({ bio: pendingProfile.bio })
      });
    }
  } catch (error) {
    console.error('Failed to apply pending profile:', error);
  } finally {
    removePendingProfile();
  }
}

function setupLoginForm() {
  const form = document.getElementById('basic-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    let valid = true;

    const email = form.email.value.trim();
    const password = form['password-input'].value.trim();

    if (!password || password.length < 8) {
      valid = false;
      showMessage('Password is required and must be at least 8 characters.', 'error');
      return;
    }

    const data = {
      email: email,
      password: password,
    };

    try {
      const json = await loginUser(data);

      setToken(json.token);
      setUsername(json.username)

      await applyPendingProfile();

      window.location.href = '/index.html';
      showMessage('Successful login!', 'success');
    } catch (err) {
      showMessage(err.message || "Network error. Please try again later.", "error");
    }
  });
}

window.addEventListener('DOMContentLoaded', setupLoginForm);
window.addEventListener('DOMContentLoaded', setupGoogleLogin);
