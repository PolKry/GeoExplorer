import { apiFetch } from "./http.js";

export async function fetchLocalUserData() {
    try {
        const res = await apiFetch('/api/users/me');
        if (!res.ok) throw new Error('Failed to fetch user profile info');

        return await res.json();
    } catch (err) {
        console.error("Error fetching local user info:", err);
        return null;
    }
}

export async function fetchAccountData() {
    try {
        const res = await apiFetch('/api/users/me/account');
        if (!res.ok) throw new Error('Failed to fetch user account info');

        return await res.json();
    } catch (err) {
        console.error("Error fetching local user account info:", err);
        return null;
    }
}

export async function fetchHighestScore(mapSrcName) {
    try {
        const res = await apiFetch(`/api/users/me/highest-score?name=${encodeURIComponent(mapSrcName)}`);
        if (!res.ok) throw new Error("Highest score data fetch failed");

        return await res.json();
    } catch (err) {
        console.error("Error fetching highest score data:", err);
        return null;
    }
}

export async function fetchFavMaps() {
    try {
        const res = await apiFetch('/api/users/me/favorite-maps');
        if (!res.ok) throw new Error('Failed to fetch favorite maps');

        return await res.json();
    } catch (err) {
        console.error("Error fetching favorite maps:", err);
        return [];
    }
}

export async function setFavMaps(mapSrcName) {
    try {
        const userData = await fetchLocalUserData();
        // TODO: Remove the id. Make it always add to the local player data.
        const res = await apiFetch(`/api/users/${userData._id}/favorite-map`, {
            method: 'PUT',
            body: JSON.stringify({ name: mapSrcName })
        });
        if (!res.ok) throw new Error('Failed to update favorites');

        return await res.json();
    } catch (err) {
        console.error("Error setting favorite maps:", err);
        return null;
    }
}

export async function setCountry(countryData) {
    try {
        const res = await apiFetch(`/api/users/me/country`, {
            method: 'PUT',
            body: JSON.stringify(countryData)
        });
        if (!res.ok) throw new Error('Failed to fetch country data');

        return await res.json();
    } catch (err) {
        console.error("Error setting country:", err);
        return null;
    }
}

export async function setBio(bio) {
    try {
        const res = await apiFetch(`/api/users/me/bio`, {
            method: 'PUT',
            body: JSON.stringify({ bio })
        });
        if (!res.ok) throw new Error('Failed to fetch bio data');

        return await res.json();
    } catch (err) {
        console.error("Error setting bio:", err);
        return null;
    }
}

export async function fetchDashboard() {
    try {
        const res = await apiFetch('/api/users/me/dashboard');
        if (!res.ok) throw new Error('Failed to fetch dashboard data');

        return await res.json();
    } catch (err) {
        console.error("Error fetching dashboard data:", err);
        return null;
    }
}

export async function setSettings(settings) {
    try {
        const res = await apiFetch(`/api/users/me/settings`, {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
        if (!res.ok) throw new Error('Failed to update settings');
    } catch (err) {
        console.error("Error setting user settings:", err);
    }
}

export async function fetchSettings() {
    try {
        const res = await apiFetch('/api/users/me/settings');
        if (!res.ok) throw new Error('Failed to fetch user settings');
        const data = await res.json();

        return data.settings || null;
    } catch (err) {
        console.error("Error fetching user settings:", err);
        return null;
    }
}