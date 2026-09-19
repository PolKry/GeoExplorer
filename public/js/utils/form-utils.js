// Password strength
const password = document.getElementById('password-input');
const strengthBar = document.querySelector('.strength-bar');
const strengthText = document.getElementById('password-strength-text');

password.addEventListener('input', () => {
    if (!strengthBar || !strengthText)
        return;

    const val = password.value;
    let strength = 0;
    
    if (!password.checkValidity() || val === "") {
        strength = 0;
    } else {
        if (val.length >= 8) strength += 1;
        if (/[A-Z]/.test(val)) strength += 1;
        if (/[0-9]/.test(val)) strength += 1;
        if (/[^A-Za-z0-9]/.test(val)) strength += 1;
    }

    // Update bar width and color
    strengthBar.style.width = `${(strength / 4) * 100}%`;
    const colors = ["#ff4c4c", "#ffae00", "#00ffae", "#00ff00"];
    strengthBar.style.backgroundColor = colors[strength - 1] || "#333";

    // Update strength text
    let text = "";
    switch (strength) {
        case 0:
        case 1:
            text = "Very Weak";
            break;
        case 2:
            text = "Weak";
            break;
        case 3:
            text = "Good";
            break;
        case 4:
            text = "Strong";
            break;
    }
    
    strengthText.textContent = text;
    strengthText.style.color = colors[strength - 1] || "#ccc";
});
document.querySelectorAll('.basic-form input').forEach(input => {
    const feedback = input.nextElementSibling;
    // Store the original text
    const originalText = feedback.textContent;

    input.addEventListener('input', () => {
        if (input.value === "") {
            feedback.textContent = originalText;
            feedback.style.color = "#ccc";
            input.style.borderColor = "#555";
        } else if (input.validity.valid) {
            feedback.textContent = "Looks good!";
            feedback.style.color = "#00ffae";
            input.style.borderColor = "#00ffae";
        } else {
            feedback.textContent = input.validationMessage;
            feedback.style.color = "#ff4c4c";
            input.style.borderColor = "#ff4c4c";
        }
    });
});

