let lastToast;

function showNotification(message, type = "info") {
    const msgBox = document.getElementById("update-message");
    if (msgBox) {
        msgBox.style.display = "none";
        msgBox.textContent = "";
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.setAttribute("role", "status");

    document.body.appendChild(toast);
    lastToast?.remove();
    lastToast = toast;

    setTimeout(() => toast.classList.add("visible"), 10);
    setTimeout(() => {
        toast.classList.remove("visible");
        setTimeout(() => {
            toast.remove();
            if (lastToast === toast) lastToast = undefined;
        }, 300);
    }, 2800);
}

export function showToast(message, type = "info") {
    showNotification(message, type);
}

export function showMessage(message, type = "success") {
    showNotification(message, type);
}
