import { apiFetch } from "./http.js";

export async function fetchLeaderboard(map, period, limit = 5) {
    try {
        const res = await apiFetch(`/api/leaderboard/${map}/${period}?limit=${limit}`);
        if (!res.ok) throw new Error("Leaderboard fetch failed");

        const data = await res.json();
        return data.topPlayers || [];
    } catch (err) {
        console.error("Error fetching leaderboard:", err);
        return [];
    }
}