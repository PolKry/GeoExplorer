import { PAGES } from "../constants/resources.js";
import { logout } from "./storage.js";

export function getUserIdFromToken(token) {
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const now = Math.floor(Date.now() / 1000);

        if (payload.exp && payload.exp < now) {
            console.warn("Token expired");
            logout();
            
            window.location.replace(PAGES.login);
            throw new Error("No token found. Redirecting to login.");
        }

        return payload.userId;
    } catch (err) {
        console.error("Failed to parse JWT", err);
        return null;
    }
}
