import { fetchLeaderboard } from "../api/leaderboard-api.js";
import { renderHomeLeaderboard } from "../renderers/leaderboard-renderer.js";

async function loadLeaderboards() {
    const hamburger = document.getElementById("hamburger");
    const navMenu = document.getElementById("nav-menu");

    if (hamburger && navMenu) {
        hamburger.addEventListener("click", () => {
            hamburger.classList.toggle("active");
            navMenu.classList.toggle("active");
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 990) {
                navMenu.classList.remove("active");
                hamburger.classList.remove("active");
            }
        });
    }

    const map = "global";
    const period = "daily";
    const topPlayers = await fetchLeaderboard(map, period, 4);

    renderHomeLeaderboard(`home-${map}-${period}`, topPlayers);
}

document.addEventListener("DOMContentLoaded", () => {
    loadLeaderboards();

    document.getElementById("scrollTopBtn")?.addEventListener("click", () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    });
});
