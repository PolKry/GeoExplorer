import { showLoadingScreen } from "../components/loading-screen.js";

const socket = window.GameShared.createSocket();

function loadGame(gameId) {
    showLoadingScreen();
}

document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("game-id");
    if (!el) return;

    const gameId = el.dataset.gameId;
    if (!gameId) return;

    window.GAME_ID = gameId;

    loadGame(gameId);
});