import { getPartyByCode, leaveParty } from "../../api/party-api.js";
import { getUserIdFromToken } from "../../utils/auth.js";
import { showToast } from "../../utils/toast.js";
import {
    renderParty,
    updatePlayerStatus,
    updatePlayerStatusBatch,
} from "../../renderers/party-renderer.js";
import { getPartyCode, getToken, removePartyCode, setPartyCode, setPartyHostId } from "../../utils/storage.js";

const socket = window.io("/party");

let currentParty;
let currentUserId;

const renderHandlers = {
    onRejoinGame: rejoinGame,
};

document.addEventListener("DOMContentLoaded", async () => {
    const token = getToken();
    if (!token) return;

    currentUserId = getUserIdFromToken(token);
    if (!currentUserId) return;

    bindCopyPartyCode();
    bindGuestControls();
    bindPageRestoreReload();

    await loadParty();
});

function bindCopyPartyCode() {
    const code = document.getElementById("party-code");

    code.addEventListener("click", () => {
        const textCode = code.textContent;
        navigator.clipboard.writeText(textCode)
            .then(() => showToast(`Copied party code: ${textCode}`, "success"))
            .catch(() => showToast("Failed to copy code.", "error"));
    });
}

function bindGuestControls() {
    document.getElementById("leave-btn").addEventListener("click", leaveCurrentParty);
}

function bindPageRestoreReload() {
    window.addEventListener("pageshow", event => {
        if (event.persisted) {
            window.location.reload();
        }
    });
}

async function loadParty() {
    const partyCode = getPartyCode();
    if (!partyCode) {
        window.location.href = "/";
        return;
    }

    try {
        currentParty = await getPartyByCode(partyCode);
        window.currentParty = currentParty;

        if (!isCurrentUserInParty()) {
            removePartyCode();
            showToast("You are no longer part of this party.", "error");
            window.location.href = "/menu/game-modes.html";
            return;
        }

        setPartyCode(currentParty.code);
        setPartyHostId(String(currentParty.host));

        socket.emit("join-party", {
            partyCode: currentParty.code,
            userId: currentUserId,
            username: getCurrentPlayer()?.username,
        });

        bindUnloadHandler();
        renderCurrentParty();
    } catch (err) {
        console.error(err);
        showToast("Error loading party", "error");
    }
}

function bindUnloadHandler() {
    window.addEventListener("beforeunload", () => {
        socket.emit("leave-party", {
            partyCode: currentParty.code,
            userId: currentUserId,
        });
    });
}

async function leaveCurrentParty() {
    try {
        await leaveParty();
        removePartyCode
        window.location.href = "/";
    } catch (err) {
        console.error(err);
        showToast(err.message || "Failed to leave the party", "error");
    }
}

function isCurrentUserInParty() {
    return Boolean(getCurrentPlayer());
}

function getCurrentPlayer() {
    return currentParty.players.find(player => normalizeId(player.user) === normalizeId(currentUserId));
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
    if (typeof id === "string") return id;
    return id?._id?.toString() || id?.toString();
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

socket.on("party-updated", party => {
    currentParty = party;
    window.currentParty = currentParty;
    renderCurrentParty();
});

socket.on("player-kicked", () => {
    removePartyCode();
    window.location.href = "/";
});

socket.on("party-disbanded", () => {
    showToast("The host disbanded the party.", "error");
    removePartyCode();

    setTimeout(() => {
        window.location.href = "/menu/game-modes.html";
    }, 2000);
});

socket.on("party:game-started", gameId => {
    window.location.href = `/play/${gameId}`;
});
