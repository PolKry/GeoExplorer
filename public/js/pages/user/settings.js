import { getSettings, setSettings } from "../../api/user-api.js";
import { getSettings as getLocalSettings, setSettings as setLocalSettings } from "../../utils/storage.js";
import { showMessage } from "../../utils/toast.js";

document.addEventListener('DOMContentLoaded', () => {
    const deleteModal = document.getElementById("delete-modal-overlay");
    const openDeleteBtn = document.getElementById("open-delete-btn");
    const closeDeleteBtn = document.getElementById("delete-close-btn");
    const cancelDeleteBtn = document.getElementById("delete-cancel-btn");
    const settingsForm = document.getElementById("settings-form");

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

    assignValues();

    // Form submit
    settingsForm?.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = {
            mapStyle: settingsForm.querySelector('input[type="hidden"]').value,
            musicVolume: musicSlider.value,
            sfxVolume: sfxSlider.value,
            soundEnabled: soundToggle.checked,
            fullscreenEnabled: fullscreenToggle.checked
        };

        try {
            const settings = JSON.stringify(payload);
            await setSettings(payload);
            setLocalSettings(settings);

            console.log('Settings saved:', settings);
            showMessage('Settings saved successfully!', 'success');
        } catch (err) {
            console.error("Failed to save settings:", err);
            showMessage('Could not save settings.', "error");
        }
    });
});

async function assignValues() {
    const saved = getLocalSettings();
    if (saved) {
        const settings = JSON.parse(saved);
        applySettings(settings);
    }

    try {
        const settings = await getSettings();
        if (settings) {
            applySettings(settings);
            setSettings(JSON.stringify(settings)); // Idk id nessary, but just in case
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
    try {
        await setSettings(defaults);
        setLocalSettings(JSON.stringify(defaults));

        console.log("Settings reset:", data);
        showMessage("Settings have been reset to defaults!", "success");
    } catch (err) {
        console.error("Failed to reset settings:", err);
        showMessage("Could not reset settings.", "error");
    }
}

