import { apiFetch } from "./http.js";

export async function fetchCountries() {
    try {
        const res = await apiFetch('/api/countries');
        if (!res.ok) throw new Error('Failed to fetch countries data');

        return await res.json();
    } catch (err) {
        console.error("Error fetching countries data:", err);
        return [];
    }
}