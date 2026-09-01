import { apiFetch } from "./http.js";

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

export async function fetchWorldGeoJson() {
    const response = await apiFetch("/data/world.geojson");

    if (!response.ok) {
        throw new Error(`Failed to fetch world.geojson: ${response.status} `);
    }

    return response.json();
}

export async function fetchReducedGeoJson() {
    const response = await apiFetch("/data/reduced.geojson");

    if (!response.ok) {
        throw new Error(`Failed to fetch reduced.geojson: ${response.status} `);
    }

    return response.json();
}