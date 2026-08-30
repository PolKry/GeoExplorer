import { registerUser } from "../../api/auth-api.js";
import { showMessage } from "../../utils/toast.js";

function setupLoginForm() {
    const form = document.querySelector('#loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        let valid = true;

        const username = form.username.value.trim();
        const email = form.email.value.trim();
        const password = form['password-input'].value.trim();

        if (username.length < 4) {
            valid = false;
            showMessage('Username must be at least 4 characters.', 'error');
            return;
        }

        if (!password || password.length < 8) {
            valid = false;
            showMessage('Password is required and must be at least 8 characters.', 'error');
            return;
        }

        const payload = {
            email: form.email.value,
            username: form.username.value,
            password: form.password.value,
        };

        try {
            await registerUser(payload);
            showMessage('Account registered successfully!', 'success');
        } catch (err) {
            showMessage(err.message || "Network error. Please try again later.", "error");
        }
    });
}

window.addEventListener('DOMContentLoaded', setupLoginForm);
