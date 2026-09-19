import { deleteAccount, updateAccount } from "../../api/auth-api.js";
import { getLocalUserData } from "../../api/user-api.js";
import { clearStorage, getToken, setUsername } from "../../utils/storage.js";
import { showMessage } from "../../utils/toast.js";

document.addEventListener("DOMContentLoaded", async () => {
    const accountForm = document.getElementById("account-form");
    const deleteModal = document.getElementById("delete-modal-overlay");
    const openDeleteBtn = document.getElementById("open-delete-btn");
    const closeDeleteBtn = document.getElementById("delete-close-btn");
    const cancelDeleteBtn = document.getElementById("delete-cancel-btn");
    const confirmDeleteBtn = document.getElementById("delete-confirm-btn");

    // Assigns input values
    await assignValues()

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

    // Submit Form
    accountForm.addEventListener("submit", updateAccountSubmit);

    // Click outside modal
    deleteModal.addEventListener("click", (e) => {
        if (e.target === deleteModal) closeDeleteModal();
    });

    // ESC key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeDeleteModal();
    });

    // CONFIRM DELETE
    confirmDeleteBtn?.addEventListener("click", async () => {
        if (!confirmDeleteBtn) return;
        confirmDeleteBtn.textContent = "Deleting...";
        confirmDeleteBtn.disabled = true;

        // TODO: Add modals
        try {
            await deleteAccount();
            alert("Account deleted. Logging out...");
            clearStorage();

            window.location.href = "/login.html";
        } catch (err) {
            showMessage(err.message || "Network error");
            confirmDeleteBtn.textContent = "Delete";
            confirmDeleteBtn.disabled = false;
        }
    });
});

async function assignValues() {
    const token = getToken();
    if (!token) return;

    const userData = await getLocalUserData();

    document.getElementById("username").value = userData.username;
    document.getElementById("email").value = userData.email;
}

async function updateAccountSubmit(event) {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const newPassword = document.getElementById("password-input").value;
    const currentPassword = document.getElementById("current-password").value;

    const token = getToken();
    if (!token) return;

    try {
        const userData = await updateAccount({ username, newPassword, currentPassword });
        if (userData.username)
            setUsername(userData.username);

        showMessage("Account updated successfully.");
    } catch (err) {
        showMessage(err.message || "Failed to update account");
    }
}