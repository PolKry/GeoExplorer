import { requireToken } from "./auth.js";

const noAuthPages = ["/login.html", "/register.html"];
const currentPath = window.location.pathname.toLowerCase();

if (!noAuthPages.includes(currentPath)) {
    requireToken();
}
