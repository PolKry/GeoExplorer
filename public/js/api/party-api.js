import { apiFetch, apiFetchJson } from "./http.js";

export function loadOrCreateParty() {
    return apiFetchJson("/api/party/create", { method: "GET" });
}

export async function getPartyByCode(partyCode) {
    const { party } = await apiFetchJson(`/api/party/${partyCode}`);
    return party;
}

export async function startPartyGame(partyCode) {
    const res = await apiFetch(`/api/party/${partyCode}/start`, { method: "POST" });
    const data = await res.json();

    if (!res.ok || !data.gameId) {
        throw new Error("Failed to start game");
    }

    return data;
}

export async function joinPartyGame(partyCode) {
    // Redirect to game page
    window.location.href = `/play/${onGoingGameId}`;
}

export async function terminatePartyGame(partyCode) {
    const res = await apiFetch(`/api/party/${partyCode}/terminate-game`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
        throw new Error("Failed to terminate party game");
    }

    return data;
}

export async function leaveParty() {
    const res = await apiFetch("/api/party/leave", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
        throw new Error("Failed to leave party");
    }

    return data;
}

export async function endParty() {
    const res = await apiFetch("/api/party/end", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
        throw new Error("Failed to end party");
    }

    return data;
}

export async function swapPartyPlayer(partyCode, userId) {
    const res = await apiFetch(`/api/party/${partyCode}/swap-player`, {
        method: "POST",
        body: JSON.stringify({ userId }),
    });

    if (!res.ok) {
        throw new Error("Failed to swap player");
    }

    return res;
}

export async function kickOfflinePartyPlayers(partyCode) {
    const res = await apiFetch(`/api/party/${partyCode}/kick-offline`, { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
        throw new Error("Failed to kick offline players");
    }

    return data;
}

export async function kickPartyPlayer(partyCode, userId) {
    const res = await apiFetchJson(`/api/party/${partyCode}/kick-player`, {
        method: "POST",
        body: JSON.stringify({ userId }),
    });
    const data = await res.json();

    if (!res.ok) {
        throw new Error("Failed to kick player");
    }

    return data;
}

export async function savePartySettings(partyCode, settings) {
    const res = await apiFetch(`/api/party/${partyCode}/settings`, {
        method: "POST",
        body: JSON.stringify(settings),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error("Failed to save settings");
    }

    return data;
}

export async function getAllMaps() {
    const res = await apiFetch("/api/maps/all");

    const data = await res.json();

    if (!res.ok) {
        throw new Error("Failed fetching maps");
    }

    return data;
}

export async function joinPartyByCode(code) {
    const res = await apiFetch("/api/party/join", {
        method: "POST",
        body: JSON.stringify({ code }),
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error("Failed to join");
    }

    return data;
}
