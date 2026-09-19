import { deleteAccount, updateAccount } from "../../api/auth-api.js";
import { getAccountData } from "../../api/user-api.js";
import { PAGES } from "../../constants/resources.js";
import { clearStorage, setUsername } from "../../utils/storage.js";
import { showMessage, showToast } from "../../utils/toast.js";

let originalUsername = "";

document.addEventListener("DOMContentLoaded", async () => {
    const accountForm = document.getElementById("account-form");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password-input");

    const deleteModal = document.getElementById("delete-modal-overlay");
    const openDeleteBtn = document.getElementById("open-delete-btn");
    const closeDeleteBtn = document.getElementById("delete-close-btn");
    const cancelDeleteBtn = document.getElementById("delete-cancel-btn");
    const confirmDeleteBtn = document.getElementById("delete-confirm-btn");

    // Assign account values
    await assignValues();

    // Update button state whenever the form changes
    const updateButtonState = () => {
        const usernameChanged = usernameInput.value.trim() !== originalUsername;
        const passwordChanged = passwordInput.value.length > 0;

        const submitBtn = accountForm.querySelector('button[type="submit"]');

        if (submitBtn) {
            submitBtn.disabled = !usernameChanged && !passwordChanged;
        }
    };

    usernameInput.addEventListener("input", updateButtonState);
    passwordInput.addEventListener("input", updateButtonState);

    // OPEN MODAL
    const openDeleteModal = () => {
        deleteModal.classList.add("show");
        document.body.style.overflow = "hidden";
    };

    // CLOSE MODAL
    const closeDeleteModal = () => {
        deleteModal.classList.remove("show");
        document.body.style.overflow = "";
    };

    // EVENTS
    openDeleteBtn.addEventListener("click", openDeleteModal);
    closeDeleteBtn?.addEventListener("click", closeDeleteModal);
    cancelDeleteBtn?.addEventListener("click", closeDeleteModal);

    accountForm.addEventListener("submit", updateAccountSubmit);

    // Click outside modal
    deleteModal.addEventListener("click", (event) => {
        if (event.target === deleteModal) {
            closeDeleteModal();
        }
    });

    // ESC key
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeDeleteModal();
        }
    });

    // CONFIRM DELETE
    confirmDeleteBtn?.addEventListener("click", async () => {
        if (!confirmDeleteBtn) return;

        confirmDeleteBtn.textContent = "Deleting...";
        confirmDeleteBtn.disabled = true;

        try {
            await deleteAccount();

            showToast("Account deleted. Logging out...", "error");
            clearStorage();

            window.location.replace(PAGES.login);
        } catch (err) {
            showMessage(err.message || "Network error", "error");

            confirmDeleteBtn.textContent = "Delete";
            confirmDeleteBtn.disabled = false;
        }
    });

    updateButtonState();
});

async function assignValues() {
    const userData = await getAccountData();

    originalUsername = userData.username;

    document.getElementById("username").value = userData.username;
    document.getElementById("email").value = userData.email;
}

async function updateAccountSubmit(event) {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const newPassword = document.getElementById("password-input").value;
    const currentPassword = document.getElementById("current-password").value;

    const usernameChanged = username !== originalUsername;
    const passwordChanged = newPassword.length > 0;

    // Frontend no-change check
    if (!usernameChanged && !passwordChanged) {
        showMessage("No changes detected", "info");
        return;
    }

    try {
        const result = await updateAccount({
            username,
            newPassword,
            currentPassword
        });

        // Backend no-change check
        if (result.changed === false) {
            showMessage(result.message || "No changes detected", "info");
            return;
        }

        originalUsername = username;
        setUsername(username);

        // Clear password fields after successful update
        document.getElementById("password-input").value = "";
        document.getElementById("current-password").value = "";

        showMessage("Account updated successfully", "success");

        // Disable Save button again
        const submitBtn = document.getElementById("update-account-btn");

        if (submitBtn) {
            submitBtn.disabled = true;
        }
    } catch (err) {
        showMessage(err.message || "Failed to update account", "error");
    }
}