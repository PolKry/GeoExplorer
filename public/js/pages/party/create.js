//menu/create.js
import {
    endParty,
    getAllMaps,
    kickOfflinePartyPlayers,
    kickPartyPlayer,
    loadOrCreateParty,
    savePartySettings,
    startPartyGame,
    swapPartyPlayer,
    terminatePartyGame,
} from "../../api/party-api.js";
import { getUserIdFromToken, requireToken } from "../../utils/auth.js";
import {
    bindCustomDropdowns,
    readSettingsForm,
    setLoadingScreenActive,
    bindCopyPartyCode
} from "../../utils/party-ui.js";
import { showToast } from "../../utils/toast.js";
import {
    renderParty,
    updatePlayerStatus,
    updatePlayerStatusBatch,
} from "../../renderers/party-renderer.js";
import {
    getPartyCode,
    removePartyCode,
    setPartyCode,
    setPartyHostId
} from "../../utils/storage.js";

const socket = window.io("/party");

let currentParty;

const renderHandlers = {
    onKickPlayer: kickPlayer,
    onSwapTeam: swapTeam,
    onRejoinGame: rejoinGame,
};

document.addEventListener("DOMContentLoaded", async () => {
    const token = requireToken();
    if (!token) return;

    bindUnloadHandler(token);
    bindCopyPartyCode();
    bindCustomDropdowns();
    bindModeSettingsControl();
    bindHostControls();
    bindDisbandControls();

    await populateMapDropdown();
    await loadParty();
});

function bindUnloadHandler(token) {
    window.addEventListener("beforeunload", () => {
        socket.emit("leave-party", {
            partyCode: getPartyCode(),
            userId: getUserIdFromToken(token),
        });
    });
}

function bindModeSettingsControl() {
    document.getElementById("game-mode-modal").addEventListener("change", event => {
        const mode = event.target.dataset.value || event.target.textContent.trim().toLowerCase();
        const closestGuess = document.getElementById("count-closest-guess-modal");
        const closestGuessSetting = closestGuess.closest(".setting-group");
        const isTeams = mode === "teams";

        closestGuess.disabled = !isTeams;
        closestGuessSetting.classList.toggle("disabled", !isTeams);
    });
}

function bindHostControls() {
    document.getElementById("start-game-btn")?.addEventListener("click", startGame);
    document.getElementById("kick-offline-btn").addEventListener("click", kickOfflinePlayers);
    document.getElementById("terminate-game-btn").addEventListener("click", terminateGame);

    document.getElementById("open-settings-btn").addEventListener("click", () => {
        document.getElementById("settings-modal-overlay").style.display = "flex";
    });
    document.getElementById("close-settings-btn").addEventListener("click", () => {
        document.getElementById("settings-modal-overlay").style.display = "none";
    });
    document.getElementById("save-settings-btn").addEventListener("click", saveSettings);
}

function bindDisbandControls() {
    const overlay = document.getElementById("disband-modal-overlay");
    const closeOverlay = () => {
        overlay.style.display = "none";
    };

    document.getElementById("disband-btn").addEventListener("click", () => {
        overlay.style.display = "flex";
    });
    document.getElementById("disband-close-btn").addEventListener("click", closeOverlay);
    document.getElementById("disband-cancel-btn").addEventListener("click", closeOverlay);
    document.getElementById("disband-confirm-btn").addEventListener("click", disbandCurrentParty);
}

async function populateMapDropdown() {
    const mapDropdown = document.getElementById("map-dropdown");
    const selected = mapDropdown.querySelector(".dropdown-selected");
    const optionsList = mapDropdown.querySelector("#map-options");
    const search = mapDropdown.querySelector(".dropdown-search");

    try {
        const { officialMaps, communityMaps } = await getAllMaps();
        const maps = [
            ...officialMaps.map(map => ({ ...map, type: "Official" })),
            ...communityMaps.map(map => ({ ...map, type: "Community" })),
        ];

        const defaultMap = maps[0];
        selected.textContent = `${defaultMap.name} (${defaultMap.type})`;
        selected.dataset.value = defaultMap._id;
        optionsList.innerHTML = "";

        maps.forEach(map => {
            const li = document.createElement("li");
            li.textContent = `${map.name} (${map.type})`;
            li.dataset.value = map._id;
            optionsList.appendChild(li);
        });

        bindMapDropdown({ selected, optionsList, search });
    } catch (err) {
        console.error("Failed to load maps:", err);
        optionsList.innerHTML = '<li style="color:red;">Failed to load maps</li>';
    }
}

function bindMapDropdown({ selected, optionsList, search }) {
    selected.addEventListener("click", event => {
        event.stopPropagation();
        const isOpen = optionsList.classList.toggle("show");
        search.style.display = isOpen ? "block" : "none";
        selected.style.display = isOpen ? "none" : "block";
        if (isOpen) search.focus();
    });

    document.addEventListener("click", () => {
        optionsList.classList.remove("show");
        search.style.display = "none";
        selected.style.display = "block";
    });

    optionsList.addEventListener("click", event => {
        if (event.target.tagName !== "LI") return;

        selected.textContent = event.target.textContent;
        selected.dataset.value = event.target.dataset.value;
        optionsList.classList.remove("show");
        search.style.display = "none";
        selected.style.display = "block";
    });

    search.addEventListener("input", () => {
        const term = search.value.toLowerCase();
        optionsList.querySelectorAll("li").forEach(li => {
            li.style.display = li.textContent.toLowerCase().includes(term) ? "block" : "none";
        });
    });
}

async function loadParty() {
    try {
        currentParty = await loadOrCreateParty();
        window.currentParty = currentParty;
        setPartyCode(currentParty.code);
        setPartyHostId(String(currentParty.host));

        socket.emit("join-party", {
            partyCode: currentParty.code,
            userId: currentParty.host,
        });

        renderCurrentParty();
    } catch (err) {
        console.error(err);
        showToast("Failed to load or create party", "error");
    }
}

async function startGame() {
    const partyCode = getPartyCode();
    if (!partyCode) return alert("No party Id found");

    setLoadingScreenActive(true);

    try {
        await startPartyGame(partyCode);
    } catch (err) {
        console.error("Failed to start game", err);
        showToast("Failed to start a game.", "error");
        setLoadingScreenActive(false);
    }
}

async function saveSettings() {
    const partyCode = getPartyCode();
    if (!partyCode) return alert("No party Id found");

    try {
        currentParty = await savePartySettings(partyCode, readSettingsForm());
        console.log(currentParty);
        window.currentParty = currentParty;
        renderCurrentParty();
        document.getElementById("settings-modal-overlay").style.display = "none";
        showToast("Settings saved!", "success");
    } catch (err) {
        console.error(err);
        showToast("Failed to save party settings", "error");
    }
}

async function swapTeam(userId) {
    const partyCode = getPartyCode();
    if (!partyCode) return alert("No party Id found");

    currentParty = await swapPartyPlayer(partyCode, userId);
    window.currentParty = currentParty;
    renderCurrentParty();
}

async function terminateGame() {
    const partyCode = getPartyCode();
    if (!partyCode) return alert("No party Id found");

    currentParty = await terminatePartyGame(partyCode);
    window.currentParty = currentParty;
    renderCurrentParty();
}

async function kickOfflinePlayers() {
    const partyCode = getPartyCode();
    if (!partyCode) return alert("No party Id found");

    currentParty = await kickOfflinePartyPlayers(partyCode);
    window.currentParty = currentParty;
    renderCurrentParty();
}

async function kickPlayer(userId) {
    const partyCode = getPartyCode();
    if (!partyCode) return alert("No party Id found");

    const hostId = typeof currentParty.host === "string" ? currentParty.host : currentParty.host._id;
    if (hostId === userId) {
        showToast("Host can not be kicked!", "error");
        return;
    }

    currentParty = await kickPartyPlayer(partyCode, userId);
    window.currentParty = currentParty;
    renderCurrentParty();
}

async function disbandCurrentParty() {
    try {
        const res = await endParty();
        if (!res.ok) throw new Error("Failed to disband party");

        showToast("Party disbanded", "success");
        removePartyCode();
        window.location.href = "/";
    } catch (err) {
        console.error(err);
        showToast("Failed to disband party", "error");
    }
}

function rejoinGame(gameId) {
    if (!gameId) {
        showToast("No party code found. Please join the party again.", "error");
        window.location.href = "/menu/game-modes.html";
        return;
    }

    window.location.href = `/play/${gameId}`;
}

function renderCurrentParty() {
    renderParty(currentParty, renderHandlers);
}

function normalizeId(id) {
    return id?.toString();
}

socket.on("player-joined", player => {
    if (!currentParty) return;

    const alreadyExists = currentParty.players.some(p => normalizeId(p.user) === normalizeId(player.userId));
    if (!alreadyExists) {
        currentParty.players.push({
            user: player.userId,
            username: player.username,
            online: true,
            team: player.team,
            color: player.color,
        });
        showToast(`${player.username} joined the party!`, "success");
    } else {
        currentParty.players = currentParty.players.map(existing =>
            normalizeId(existing.user) === normalizeId(player.userId)
                ? { ...existing, online: true, team: player.team, color: player.color }
                : existing
        );
    }

    renderCurrentParty();
});

socket.on("player-left", ({ userId, username }) => {
    if (!currentParty) return;

    currentParty.players = currentParty.players.filter(player => normalizeId(player.user) !== normalizeId(userId));
    showToast(`${username} left the party!`, "error");
    renderCurrentParty();
});

socket.on("player-status", ({ userId, status }) => {
    updatePlayerStatus(userId, status);
});

socket.on("player-status-batch", ({ online }) => {
    updatePlayerStatusBatch(online);
});

socket.on("party-disbanded", () => {
    showToast("The host disbanded the party.", "error");
    setTimeout(() => {
        window.location.href = "/";
    }, 2000);
});

socket.on("party:game-started", gameId => {
    window.location.href = `/play/${gameId}`;
});
