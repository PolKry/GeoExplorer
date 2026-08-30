import { apiFetch, apiFetchJson } from "./http.js";

export async function fetchMapData(mapId) {
    try {
        const res = await apiFetch(`/api/maps/data?map=${mapId}`);
        if (!res.ok) throw new Error("Map data fetch failed");

        const data = await res.json();
        return data;
    } catch (err) {
        console.error("Error fetching map data:", err);
        return null;
    }
}