import { showLoadingScreen, hideLoadingScreen } from "../../components/loading-screen.js";
import { PAGES } from "../../constants/resources.js";
import { startCountry } from "../../api/game-starter-api.js";

let startInProgress = false;

document.addEventListener('DOMContentLoaded', () => {
    const countryButton = document.getElementById("country-mode-button");
    const pointsButton = document.getElementById("points-mode-button");
    const ffaButton = document.getElementById("ffa-mode-button");

    countryButton?.addEventListener('click', () => {
        startCountryMode();
    });

    pointsButton?.addEventListener('click', () => {
        window.location.href = PAGES.partyDashboard;
    });

    ffaButton?.addEventListener('click', () => {
        window.location.href = PAGES.partyDashboard;
    });
});

window.addEventListener("pageshow", () => {
    startInProgress = false;
    const modeButton = document.getElementById("country-mode-button");
    if (modeButton) modeButton.disabled = false;
    hideLoadingScreen();
});

async function startCountryMode() {
    if (startInProgress) return;

    startInProgress = true;
    const modeButton = document.getElementById("country-mode-button");
    modeButton.disabled = true;
    showLoadingScreen();

    const data = await startCountry();

    if (!data?.gameId) {
        console.error("Failed to start game", data);

        startInProgress = false;
        modeButton.disabled = false;

        hideLoadingScreen();
        return;
    }

    // Redirect immediately
    window.location.href = `/play/${data.gameId}`;
}
