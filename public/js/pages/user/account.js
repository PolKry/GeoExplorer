import { deleteAccount } from "../../api/auth-api.js";

document.addEventListener("DOMContentLoaded", () => {
    const deleteModal = document.getElementById("delete-modal-overlay");
    const openDeleteBtn = document.getElementById("open-delete-btn");
    const closeDeleteBtn = document.getElementById("delete-close-btn");
    const cancelDeleteBtn = document.getElementById("delete-cancel-btn");
    const confirmDeleteBtn = document.getElementById("delete-confirm-btn");

    if (!deleteModal || !openDeleteBtn) return;

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

    // click outside modal
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

        try {
            await deleteAccount();
            alert("Account deleted. Logging out...");
            localStorage.removeItem("token");
            localStorage.removeItem("username");
            window.location.href = "/login.html";
        } catch (err) {
            alert(err.message || "Network error");
            confirmDeleteBtn.textContent = "Delete";
            confirmDeleteBtn.disabled = false;
        }
    });
});
