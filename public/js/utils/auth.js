import { logout } from "./storage";

export function getUserIdFromToken(token) {
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const now = Math.floor(Date.now() / 1000);

        if (payload.exp && payload.exp < now) {
            console.warn("Token expired");
            logout();
            window.location.href = "/login.html";
            return null;
        }

        return payload.userId;
    } catch (err) {
        console.error("Failed to parse JWT", err);
        return null;
    }
}
