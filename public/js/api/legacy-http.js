async function apiFetch(url, options = {}) {
    const token = localStorage.getItem("token");
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
    };

    const res = await fetch(url, { ...options, headers });

    // Global 401 handling
    if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        window.location.href = "/login.html";
        throw new Error("Unauthorized");
    }

    return res;
}

async function apiFetchJson(url, options = {}) {
    const res = await apiFetch(url, options);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Request failed (${res.status}): ${text}`);
    }
    return res.json();
}