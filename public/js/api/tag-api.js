import { apiFetch, apiFetchJson } from "./http.js";

export async function fetchTag(name) {
    try {
        const res = await apiFetch(`/api/tags/description?name=${encodeURIComponent(name)}`);
        if (!res.ok) throw new Error("Tag fetch failed");

        const data = await res.text();
        return data;
    } catch (err) {
        console.error("Error fetching map data:", err);
        return null;
    }
}