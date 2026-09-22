import { apiFetch } from "./http.js";

export async function startPoints(mapCode, gameplayMode, roundTime, maxRounds = 5) {
    try {
        const res = await apiFetch(`/api/game/points-mode/start`, {
            method: "POST",
            body: JSON.stringify({
                gameplayMode,
                mapCode,
                roundTime,
                maxRounds
            }),
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.error || "Failed to start points game");
        }

        return await res.json();
    } catch (err) {
        console.error("Error starting points game:", err);
        return null;
    }
}

export async function startCountry(
    mapCode = "World",
    gameplayMode = "moving",
    roundTime = 60,
    maxRounds = 5
) {
    try {
        const res = await apiFetch(`/api/game/country-mode/start`, {
            method: "POST",
            body: JSON.stringify({
                gameplayMode,
                mapCode,
                roundTime,
                maxRounds
            }),
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.error || "Failed to start country game");
        }

        return await res.json();
    } catch (err) {
        console.error("Error starting country game:", err);
        return null;
    }
}
