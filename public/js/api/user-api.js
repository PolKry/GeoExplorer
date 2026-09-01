import { apiFetch } from "./http.js";

export async function fetchUserScore(mapSrcName) {
    try {
        const res = await apiFetch(`/api/users/highest-score?name=${encodeURIComponent(mapSrcName)}`);
        if (!res.ok) throw new Error("Map data fetch failed");

        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Error fetching map data:", err);
        return null;
    }
}