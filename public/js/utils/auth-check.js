import { getToken } from "./storage.js";

const noAuthPages = ["/login.html", "/register.html"];
const currentPath = window.location.pathname.toLowerCase();

if (!noAuthPages.includes(currentPath)) {
    if (!getToken()) {
        window.location.href = "/login.html";
    }
}