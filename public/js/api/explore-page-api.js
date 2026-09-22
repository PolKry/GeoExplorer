import { apiFetch } from "./http.js";

export async function fetchMapsForPage(page, type) {
    try {
        const res = await apiFetch(`/api/maps?page=${page}&type=${type}`);
        return await res.json();
    } catch (err) {
        console.error("Error fetching maps for page:", err);
        return { maps: [], hasMore: false };
    }
}

export async function searchMaps(query, type, onlyFavMaps) {
    try {
        const res = await apiFetch(`/api/maps/search?query=${encodeURIComponent(query)}&type=${type}&onlyFavMaps=${onlyFavMaps}`);
        return await res.json();
    } catch (err) {
        console.error("Error searching maps:", err);
        return { maps: [], hasMore: false };
    }
}