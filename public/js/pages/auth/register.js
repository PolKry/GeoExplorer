import { registerUser } from "../../api/auth-api.js";
import { showMessage } from "../../utils/toast.js";

const stepMap = {
    1: document.querySelector('[data-step="1"]'),
    2: document.querySelector('[data-step="2"]'),
    3: document.querySelector('[data-step="3"]')
};

let currentStep = 1;

function goToStep(step) {
    currentStep = step;

    Object.entries(stepMap).forEach(([key, element]) => {
        if (!element) return;
        const isActive = Number(key) === step;
        element.classList.toggle('is-active', isActive);
        element.setAttribute('aria-hidden', String(!isActive));
    });
}

function validateAccountStep(form) {
    const username = form.username.value.trim();
    const email = form.email.value.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMessage('Please enter a valid email address.', 'error');
        return false;
    }

    if (username.length < 4) {
        showMessage('Username must be at least 4 characters.', 'error');
        return false;
    }

    return true;
}

function validatePasswordStep(form) {
    const password = form.password.value.trim();
    const confirmPassword = form.confirmPassword.value.trim();

    if (!password || password.length < 8) {
        showMessage('Password is required and must be at least 8 characters.', 'error');
        return false;
    }

    if (password !== confirmPassword) {
        showMessage('Passwords do not match.', 'error');
        return false;
    }

    return true;
}

async function populateCountryOptions(select) {
    if (!select) return;

    try {
        const response = await fetch('/api/countries');
        if (!response.ok) throw new Error('Unable to load countries');

        const countries = await response.json();
        const options = [...countries].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        options.forEach((country) => {
            const option = document.createElement('option');
            option.value = country.code;
            option.textContent = country.name;
            option.dataset.name = country.name;
            select.appendChild(option);
        });
    } catch (error) {
        console.error(error);
    }
}

function setupStepNavigation() {
    document.querySelectorAll('.next-step').forEach((button) => {
        button.addEventListener('click', () => {
            const nextStep = Number(button.dataset.next);
            const currentForm = button.closest('.auth-step')?.querySelector('form');

            if (currentStep === 1 && currentForm && !validateAccountStep(currentForm)) {
                return;
            }

            if (currentStep === 2 && currentForm && !validatePasswordStep(currentForm)) {
                return;
            }

            goToStep(nextStep);
        });
    });

    document.querySelectorAll('.back-step').forEach((button) => {
        button.addEventListener('click', () => {
            goToStep(Number(button.dataset.back));
        });
    });
}

function setupRegisterCompletion() {
    const saveBtn = document.getElementById('save-profile-btn');
    const skipBtn = document.getElementById('skip-profile-btn');
    const countrySelect = document.getElementById('setup-country');
    const bioInput = document.getElementById('setup-bio');

    saveBtn.disabled = true;
    saveBtn.style.opacity = '0.6';
    saveBtn.style.cursor = 'not-allowed';

    const loadCountries = async () => {
        await populateCountryOptions(countrySelect);
        saveBtn.disabled = false;
        saveBtn.style.opacity = '';
        saveBtn.style.cursor = '';
    };

    loadCountries();

    const finalizeRegistration = async (skipProfile = false) => {
        const form = document.getElementById('basic-form');
        const passwordForm = document.getElementById('password-form');

        const payload = {
            email: form.email.value.trim(),
            username: form.username.value.trim(),
            password: passwordForm.password.value.trim(),
            ...(skipProfile ? {} : {
                bio: bioInput.value.trim(),
                country: {
                    name: countrySelect.options[countrySelect.selectedIndex]?.dataset?.name || '',
                    code: countrySelect.value || ''
                }
            })
        };

        try {
            await registerUser(payload);
            showMessage('Account created successfully! Check your email to verify it.', 'success');
            form.reset();
            passwordForm.reset();
            bioInput.value = '';
            countrySelect.selectedIndex = 0;
            goToStep(1);
        } catch (err) {
            showMessage(err.message || 'Network error. Please try again later.', 'error');
        }
    };

    saveBtn?.addEventListener('click', () => finalizeRegistration(false));
    skipBtn?.addEventListener('click', () => finalizeRegistration(true));
}

function setupLoginForm() {
    const form = document.querySelector('#basic-form');
    if (!form) return;

    setupStepNavigation();
    setupRegisterCompletion();

    const passwordForm = document.getElementById('password-form');
    const passwordInput = passwordForm?.querySelector('#password-input');
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.getElementById('password-strength-text');

    passwordInput?.addEventListener('input', () => {
        if (!strengthBar || !strengthText) return;

        const val = passwordInput.value;
        let strength = 0;

        if (val.length >= 8) strength += 1;
        if (/[A-Z]/.test(val)) strength += 1;
        if (/[0-9]/.test(val)) strength += 1;
        if (/[^A-Za-z0-9]/.test(val)) strength += 1;

        strengthBar.style.width = `${(strength / 4) * 100}%`;
        const colors = ['#ff4c4c', '#ffae00', '#00ffae', '#00ff00'];
        strengthBar.style.backgroundColor = colors[strength - 1] || '#333';

        const labels = ['Very Weak', 'Weak', 'Good', 'Strong'];
        strengthText.textContent = labels[strength - 1] || '';
        strengthText.style.color = colors[strength - 1] || '#ccc';
    });
}

window.addEventListener('DOMContentLoaded', setupLoginForm);
