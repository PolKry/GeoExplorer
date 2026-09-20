import { showLoadingScreen, hideLoadingScreen } from "../../components/loading-screen.js";
import { PAGES } from "../../constants/resources.js";

let startInProgress = false;

document.addEventListener('DOMContentLoaded', () => {
    const countryButton = document.getElementById("country-mode-button");
    const pointsButton = document.getElementById("points-mode-button");
    const ffaButton = document.getElementById("ffa-mode-button");

    countryButton?.addEventListener('click', () => {
        startPointsMode();
    });

    pointsButton?.addEventListener('click', () => {
        window.location.href = PAGES.createParty;
    });

    ffaButton?.addEventListener('click', () => {
        window.location.href = PAGES.createParty;
    });
});

window.addEventListener("pageshow", () => {
    startInProgress = false;
    const modeButton = document.getElementById("country-mode-button");
    if (modeButton) modeButton.disabled = false;
    hideLoadingScreen();
});

async function startPointsMode() {
    if (startInProgress) return;

    startInProgress = true;
    const modeButton = document.getElementById("country-mode-button");
    modeButton.disabled = true;
    showLoadingScreen();

    const res = await startCountryGameRes(gameData.map.srcName, roundLength);
    const data = await res.json();

    if (!res.ok || !data.gameId) {
        console.error("Failed to start game", data);
        startInProgress = false;
        modeButton.disabled = false;
        hideLoadingScreen();
        return;
    }

    // Redirect immediately
    window.location.href = `/play/${data.gameId}`;
}