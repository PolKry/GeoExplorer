import { apiFetch } from "./http.js";

export async function loginUser(credentials) {
    const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
    });
    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.message || "Failed to login into your account");
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
