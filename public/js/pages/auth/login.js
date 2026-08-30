import { loginUser } from "../../api/auth-api.js";
import { showMessage } from "../../utils/toast.js";

function setupLoginForm() {
  const form = document.getElementById('loginForm');
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
      localStorage.setItem("token", json.token);
      localStorage.setItem("username", json.username);
      window.location.href = '/index.html';
      showMessage('Successful login!', 'success');
    } catch (err) {
      showMessage(err.message || "Network error. Please try again later.", "error");
    }
  });
}

window.addEventListener('DOMContentLoaded', setupLoginForm);
