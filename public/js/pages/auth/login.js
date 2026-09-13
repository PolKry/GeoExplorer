import {
  setToken,
  setUsername,
  getPendingProfile,
  removePendingProfile
} from "../../utils/storage.js";

import { loginUser } from "../../api/auth-api.js";
import { showMessage } from "../../utils/toast.js";
import { apiFetch } from "../../api/http.js";

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
