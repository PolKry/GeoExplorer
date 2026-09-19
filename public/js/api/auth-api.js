import { apiFetch } from "./http.js";

export async function loginUser(credentials) {
    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
    });
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || "Failed to login into your account");
    }

    return data;
}

export async function loginWithGoogle(credential) {
    const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ credential })
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to login with Google");
    }

    return data;
}

export async function getGoogleClientId() {
    const response = await fetch('/api/auth/google-client-id');
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Failed to get Google client ID");
    }

    return data.clientId;
}

// TODO: Not used yet, but might be useful in the future
export async function logoutUser() {
    const res = await apiFetch("/api/auth/logout", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || "Failed to logout");
    }

    return data;
}

export async function registerUser(payload) {
    const res = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || "Failed to register account");
    }

    return data;
}

export async function deleteAccount() {
    const res = await apiFetch("/api/auth/delete", { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || "Failed to delete account");
    }

    return data;
}

export async function updateAccount(payload) {
    const res = await apiFetch("/api/auth/update-account", {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || "Failed to update account");
    }

    return data;
}