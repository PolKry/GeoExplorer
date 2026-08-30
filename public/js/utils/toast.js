let lastToast;

export function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    if (window.innerWidth < 600) {
        toast.style.right = "50%";
        toast.style.transform = "translateX(50%) translateY(20px)";
    }

    document.body.appendChild(toast);
    lastToast?.remove();
    lastToast = toast;

    setTimeout(() => toast.classList.add("visible"), 50);
    setTimeout(() => {
        toast.classList.remove("visible");
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

export function showMessage(message, type = "success") {
    const msgBox = document.getElementById("update-message");
    if (!msgBox) return;

    msgBox.textContent = message;
    msgBox.className = `update-message ${type}`;
    msgBox.style.display = "block";

    if (msgBox.timer) clearTimeout(msgBox.timer);
    msgBox.timer = setTimeout(() => {
        msgBox.style.display = "none";
    }, 3000);
}
