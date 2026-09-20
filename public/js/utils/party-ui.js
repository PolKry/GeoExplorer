import { showLoadingScreen, hideLoadingScreen } from "../../components/loading-screen.js";
import { showToast } from "./toast.js";

export function bindCustomDropdowns() {
    document.querySelectorAll(".custom-dropdown").forEach(dropdown => {
        const selected = dropdown.querySelector(".dropdown-selected");
        const options = dropdown.querySelector(".dropdown-options");

        selected?.addEventListener("click", () => {
            options?.classList.toggle("show");
        });

        options?.querySelectorAll("li").forEach(option => {
            option.addEventListener("click", () => {
                selected.textContent = option.textContent;
                selected.dataset.value = option.dataset.value;
                options.classList.remove("show");
                selected.dispatchEvent(new Event("change"));
            });
        });

        document.addEventListener("click", event => {
            if (!dropdown.contains(event.target)) {
                options?.classList.remove("show");
            }
        });
    });
}

export function bindCopyPartyCode() {
    const code = document.getElementById("party-code");
    code.addEventListener("click", () => {
        const textCode = code.textContent;
        navigator.clipboard.writeText(textCode)
            .then(() => showToast(`Copied party code: ${textCode}`, "success"))
            .catch(() => showToast("Failed to copy code.", "error"));
    });
}

export function readSettingsForm() {
    return {
        mode: document.getElementById("game-mode-modal").dataset.value,
        map: document.getElementById("map-modal").dataset.value,
        rounds: parseInt(document.getElementById("rounds-modal").value, 10),
        maxMultiplier: parseInt(document.getElementById("max-multiplier-modal").value, 10),
        time: parseInt(document.getElementById("time-modal").value, 10),
        waitForFirstGuess: document.getElementById("first-guess-modal").checked,
        unlimitedTime: document.getElementById("unlimited-time-modal").checked,
        countOnlyClosestGuess: document.getElementById("count-closest-guess-modal").checked,
    };
}
