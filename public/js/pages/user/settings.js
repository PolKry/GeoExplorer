import { apiFetch } from "../../api/http.js";
import { getSettings, setSettings } from "../../utils/storage.js";
import { showMessage } from "../../utils/toast.js";

document.addEventListener('DOMContentLoaded', () => {
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

    const selectContainers = document.querySelectorAll('.custom-select-container');

    selectContainers.forEach(container => {
        const trigger = container.querySelector('.custom-select-trigger');
        const options = container.querySelectorAll('.custom-select-options span');
        const hiddenInput = container.querySelector('input[type="hidden"]');

        if (options.length > 0 && (!hiddenInput.value || hiddenInput.value === "")) {
            const firstOption = options[0];
            trigger.textContent = firstOption.textContent;
            if (hiddenInput) hiddenInput.value = firstOption.dataset.value;
        }

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            container.classList.toggle('open');
        });

        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                trigger.textContent = option.textContent;
                if (hiddenInput) hiddenInput.value = option.dataset.value;
                container.classList.remove('open');
            });
        });
    });

    document.addEventListener('click', () => {
        selectContainers.forEach(container => container.classList.remove('open'));
    });

    const musicSlider = document.getElementById('music-volume');
    const sfxSlider = document.getElementById('sfx-volume');
    const musicLabel = document.getElementById('music-volume-label');
    const sfxLabel = document.getElementById('sfx-volume-label');

    const soundToggle = document.getElementById('sound-toggle');
    const fullscreenToggle = document.getElementById('fullscreen-toggle');

    musicSlider.addEventListener('input', () => {
        musicLabel.textContent = " " + musicSlider.value + '%';
    });

    sfxSlider.addEventListener('input', () => {
        sfxLabel.textContent = sfxSlider.value + '%';
    });

    fullscreenToggle.addEventListener('change', () => {
        toggleFullscreen(fullscreenToggle.checked);
    });

    const resetBtn = document.getElementById('delete-confirm-btn');
    resetBtn.addEventListener('click', async () => {
        resetSettings();
        closeDeleteModal();
    });

    AssignValues();

    // Form submit → send to backend
    confirmDeleteBtn?.addEventListener("click", async () => {

        const payload = {
            mapStyle: form.querySelector('input[type="hidden"]').value,
            musicVolume: musicSlider.value,
            sfxVolume: sfxSlider.value,
            soundEnabled: soundToggle.checked,
            fullscreenEnabled: fullscreenToggle.checked
        };

        try {
            const profileRes = await apiFetch(`/api/users/me`);

            if (!profileRes.ok) throw new Error('Failed to apiFetch user profile info');

            const profileData = await profileRes.json();
            const settings = JSON.stringify(payload);
            setSettings(settings);

            const res = await apiFetch(`/api/users/${profileData._id}/settings`, {
                method: 'PUT',
                body: settings
            });

            if (!res.ok) {
                throw new Error(`Server error: ${res.status}`);
            }

            const data = await res.json();
            console.log('Settings saved:', data);
            showMessage('Settings saved successfully!', 'success');
        } catch (err) {
            console.error("Failed to save settings:", err);
            showMessage('Could not save settings.', "error");
        }
    });
});

async function AssignValues() {
    const saved = getSettings();
    if (saved) {
        const settings = JSON.parse(saved);
        applySettings(settings);
    }

    try {
        const res = await apiFetch(`/api/users/me`);
        const data = await res.json();

        if (!res.ok) {
            showMessage(data.message || 'Failed to fetch user profile info', 'error');
            return;
        }

        if (data.settings) {
            applySettings(data.settings);
            setSettings(JSON.stringify(data.settings)); // sync back
        }
    } catch (err) {
        showMessage("Error loading settings.", "error");
    }
}

function toggleFullscreen(enable) {
    if (enable) {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Failed to enable fullscreen: ${err.message}`);
            });
        }
    } else {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => {
                console.error(`Failed to exit fullscreen: ${err.message}`);
            });
        }
    }
}

function applySettings(settings) {
    const trigger = document.querySelector('.custom-select-trigger');
    const hiddenInput = document.querySelector('input[type="hidden"]');

    const musicSlider = document.getElementById('music-volume');
    const sfxSlider = document.getElementById('sfx-volume');
    const musicLabel = document.getElementById('music-volume-label');
    const sfxLabel = document.getElementById('sfx-volume-label');

    const soundToggle = document.getElementById('sound-toggle');
    const fullscreenToggle = document.getElementById('fullscreen-toggle');

    hiddenInput.value = settings.mapStyle;
    trigger.innerText = settings.mapStyle;

    musicSlider.value = settings.musicVolume;
    musicLabel.innerText = settings.musicVolume + "%";
    sfxSlider.value = settings.sfxVolume;
    sfxLabel.innerText = settings.sfxVolume + "%";

    soundToggle.checked = settings.soundEnabled;
    fullscreenToggle.checked = settings.fullscreenEnabled;

    toggleFullscreen(settings.fullscreenEnabled);
}

async function resetSettings() {
    const defaults = {
        mapStyle: "Street View",
        musicVolume: 50,
        sfxVolume: 50,
        soundEnabled: true,
        fullscreenEnabled: false
    };

    applySettings(defaults);

    setSettings(JSON.stringify(defaults));

    // Send to backend
    try {
        const profileRes = await apiFetch(`/api/users/me`);
        if (!profileRes.ok) throw new Error('Failed to apiFetch user profile info');

        const profileData = await profileRes.json();

        const res = await apiFetch(`/api/users/${profileData._id}/settings`, {
            method: 'PUT',
            body: JSON.stringify(defaults)
        });

        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        const data = await res.json();
        console.log("Settings reset:", data);
        showMessage("Settings have been reset to defaults!", "success");
    } catch (err) {
        console.error("Failed to reset settings:", err);
        showMessage("Could not reset settings.", "error");
    }
}

