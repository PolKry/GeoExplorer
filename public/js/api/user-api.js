import { apiFetch } from "./http.js";

export async function getLocalUserData() {
    try {
        const res = await apiFetch('/api/users/me');
        if (!res.ok) throw new Error('Failed to fetch user profile info');
        return await res.json();
    } catch (err) {
        console.error("Error fetching local user info:", err);
        return null;
    }
}

export async function setUserFavMaps(mapSrcName) {
    try {
        const userData = await getLocalUserData();
        // TODO: Remove the id. Make it always add to the local player data.
        const res = await apiFetch(`/api/users/${userData._id}/favorite-map`, {
            method: 'PUT',
            body: JSON.stringify({ name: mapSrcName })
        });

        if (!res.ok) throw new Error('Failed to update favorites');
        return await res.json();
    } catch (err) {
        console.error("Error fetching map data:", err);
        return null;
    }
}

export async function addUserFavMaps(mapSrcName) {
    try {
        const res = await apiFetch(`/api/users/highest-score?name=${encodeURIComponent(mapSrcName)}`);
        if (!res.ok) throw new Error("Map data fetch failed");
        return await res.json();
    } catch (err) {
        console.error("Error fetching map data:", err);
        return null;
    }
}

export async function getUserFavMaps() {
    try {
        const res = await apiFetch('/api/users/me/favorite-maps');
        if (!res.ok) throw new Error('Failed to fetch favorite maps');
        return await res.json();
    } catch (err) {
        console.error("Error fetching favorite maps:", err);
        return [];
    }
}