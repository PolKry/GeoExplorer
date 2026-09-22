//menu/create.js
import {
    endParty,
    fetchAllMaps,
    kickOfflinePartyPlayers,
    kickPartyPlayer,
    fetchPartyByCode,
    joinPartyById,
    leaveParty,
    loadOrCreateParty,
    savePartySettings,
    startPartyGame,
    swapPartyPlayer,
    terminatePartyGame,
} from "../../api/party-api.js";
import { getUserIdFromToken } from "../../utils/auth.js";
import {
    bindCustomDropdowns,
    readSettingsForm,
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
    getToken,
    removePartyCode,
    setPartyCode,
    setPartyHostId
} from "../../utils/storage.js";
import { PAGES } from "../../constants/resources.js";
import { hideLoadingScreen, showLoadingScreen } from "../../components/loading-screen.js";

const socket = window.io("/party");
const disbandBtn = document.getElementById("disband-confirm-btn");

let currentParty;
let currentUserId;
let isHost = false;

let renderHandlers = { onRejoinGame: rejoinGame };

document.addEventListener("DOMContentLoaded", async () => {
    const token = getToken();
    currentUserId = getUserIdFromToken(token);

    bindUnloadHandler(token);
    bindCopyPartyCode();
    bindCustomDropdowns();
    bindModeSettingsControl();
    bindHostControls();
    bindDisbandControls();
    bindLeaveControl();
    bindCopyInviteLink();

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
        openModal("settings-modal-overlay");
    });
    document.getElementById("close-settings-btn").addEventListener("click", () => {
        closeModal("settings-modal-overlay");
    });
    document.getElementById("save-settings-btn").addEventListener("click", saveSettings);
}

function bindDisbandControls() {
    const overlay = document.getElementById("disband-modal-overlay");
    const closeOverlay = () => {
        closeModal(overlay.id);
    };

    document.getElementById("disband-btn").addEventListener("click", () => {
        openModal(overlay.id);
    });
    document.getElementById("disband-close-btn").addEventListener("click", closeOverlay);
    document.getElementById("disband-cancel-btn").addEventListener("click", closeOverlay);
    disbandBtn.addEventListener("click", disbandCurrentParty);
}

function openModal(id) {
    document.getElementById(id).style.display = "flex";
    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");
}

function closeModal(id) {
    document.getElementById(id).style.display = "none";
    document.documentElement.classList.remove("modal-open");
    document.body.classList.remove("modal-open");
}

function bindLeaveControl() {
    document.getElementById("leave-btn").addEventListener("click", leaveCurrentParty);
}

function bindCopyInviteLink() {
    document.getElementById("copy-party-link-btn").addEventListener("click", async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            showToast("Invite link copied", "success");
        } catch {
            showToast("Failed to copy invite link", "error");
        }
    });
}

async function populateMapDropdown() {
    const mapDropdown = document.getElementById("map-dropdown");
    const selected = mapDropdown.querySelector(".dropdown-selected");
    const optionsList = mapDropdown.querySelector("#map-options");
    const search = mapDropdown.querySelector(".dropdown-search");

    try {
        const { officialMaps, communityMaps } = await fetchAllMaps();
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

function hidePlayersLoading() {
    document.querySelectorAll(".players-loading").forEach(loader => {
        loader.remove();
    });
}

async function loadParty() {
    try {
        const partyId = getPartyIdFromUrl();
        if (partyId) {
            await joinPartyById(partyId);
            currentParty = await fetchPartyByCode(partyId);
        } else {
            currentParty = await loadOrCreateParty();
            window.history.replaceState({}, "", `/party/${encodeURIComponent(currentParty.code)}`);
        }

        window.currentParty = currentParty;
        setPartyCode(currentParty.code);
        setPartyHostId(String(currentParty.host));
        isHost = normalizeId(currentParty.host) === normalizeId(currentUserId);

        // A shared /party/:code invitation first reaches this route. After
        // joining, send non-hosts to their read-only lobby before controls
        // are rendered or become interactable.
        if (!isHost) {
            window.location.replace(PAGES.waitingRoom);
            return;
        }

        renderHandlers = isHost
            ? { onKickPlayer: kickPlayer, onSwapTeam: swapTeam, onRejoinGame: rejoinGame }
            : { onRejoinGame: rejoinGame };
        updateRoleControls();

        socket.emit("join-party", {
            partyCode: currentParty.code,
            userId: currentUserId,
        });

        renderCurrentParty();
        hidePlayersLoading();

    } catch (err) {
        console.error(err);
        removePartyCode();
        window.location.replace(PAGES.gameModes);
    }
}

function getPartyIdFromUrl() {
    const match = window.location.pathname.match(/^\/party\/([^/]+)$/);
    if (!match || match[1] === "dashboard") return null;
    return decodeURIComponent(match[1]);
}

function updateRoleControls() {
    document.querySelectorAll("[data-host-control]").forEach(element => {
        element.style.display = isHost ? "" : "none";
    });
    document.getElementById("leave-btn").style.display = isHost ? "none" : "inline-block";
    updateStartGameControl();
}

function updateStartGameControl() {
    const startButton = document.getElementById("start-game-btn");
    if (!startButton) return;

    const needsAnotherPlayer = !currentParty || currentParty.players.length < 2;

    startButton.disabled = false;
    startButton.classList.toggle("start-game-blocked", needsAnotherPlayer);
    startButton.setAttribute("aria-disabled", String(needsAnotherPlayer));
    startButton.title = needsAnotherPlayer ? "At least two players are required" : "";
}

async function startGame() {
    console.log("At least two players are required to start a party game.");
    const partyCode = getPartyCode();
    if (!partyCode) return showToast("No party Id found", "error");
    if (currentParty?.players.length < 2) {
        showToast("At least two players are required to start a party game.", "error");
        return;
    }

    showLoadingScreen();

    try {
        await startPartyGame(partyCode);
    } catch (err) {
        hideLoadingScreen();
        showToast("Failed to start a game.", "error");
        console.error("Failed to start game", err);
    }
}

async function saveSettings() {
    const partyCode = getPartyCode();
    if (!partyCode) return showToast("No party Id found", "error");

    try {
        currentParty = await savePartySettings(partyCode, readSettingsForm());
        console.log(currentParty);
        window.currentParty = currentParty;
        renderCurrentParty();
        closeModal("settings-modal-overlay");
        showToast("Settings saved!", "success");
    } catch (err) {
        console.error(err);
        showToast("Failed to save party settings", "error");
    }
}

async function swapTeam(userId) {
    const partyCode = getPartyCode();
    if (!partyCode) return showToast("No party Id found", "error");

    if (currentParty.mode !== "teams") {
        showToast("Team swapping is only available in team mode.", "error");
        return;
    }

    currentParty = await swapPartyPlayer(partyCode, userId);
    window.currentParty = currentParty;
    renderCurrentParty();
}

async function terminateGame() {
    const partyCode = getPartyCode();
    if (!partyCode) return showToast("No party Id found", "error");

    currentParty = await terminatePartyGame(partyCode);
    window.currentParty = currentParty;
    renderCurrentParty();
}

async function kickOfflinePlayers() {
    const partyCode = getPartyCode();
    if (!partyCode) return showToast("No party Id found", "error");

    currentParty = await kickOfflinePartyPlayers(partyCode);
    window.currentParty = currentParty;
    renderCurrentParty();
}

async function kickPlayer(userId) {
    const partyCode = getPartyCode();
    if (!partyCode) return showToast("No party Id found", "error");

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
        disbandBtn.disabled = true;
        disbandBtn.textContent = "Disbanding...";
        disbandBtn.classList.add("disabled");

        await endParty();
        showToast("Party disbanded", "success");
        removePartyCode();

        window.location.replace(PAGES.home);
    } catch (err) {
        console.error(err);
        showToast("Failed to disband party", "error");

        disbandBtn.disabled = false;
        disbandBtn.textContent = "Disband";
        disbandBtn.classList.remove("disabled");
    }
}

async function leaveCurrentParty() {
    try {
        await leaveParty();
        removePartyCode();
        window.location.replace(PAGES.home);
    } catch (err) {
        showToast(err.message || "Failed to leave the party", "error");
    }
}

function rejoinGame(gameId) {
    if (!gameId) {
        showToast("No party code found. Please join the party again.", "error");
        window.location.replace(PAGES.home);
        return;
    }

    window.location.href = `/play/${gameId}`;
}

function renderCurrentParty() {
    renderParty(currentParty, renderHandlers);
    updateStartGameControl();
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
        window.location.replace(PAGES.home);
    }, 2000);
});

socket.on("party:game-started", gameId => {
    window.location.href = `/play/${gameId}`;
});
