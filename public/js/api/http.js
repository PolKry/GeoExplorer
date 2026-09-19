import { PAGES } from "../constants/resources.js";
import {
    getToken,
    logout
} from "../utils/storage.js";

export async function apiFetch(url, options = {}) {
    const token = getToken();
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
        logout();

        window.location.replace(PAGES.login);
        throw new Error("Unauthorized");
    }

    return res;
}

export async function apiFetchJson(url, options = {}) {
    const res = await apiFetch(url, options);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Request failed (${res.status}): ${text}`);
    }

    return res.json();
}
