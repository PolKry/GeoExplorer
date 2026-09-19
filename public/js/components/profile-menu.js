import { PAGES } from "../constants/resources.js";
import { getToken, logout } from "../utils/storage.js";

function initializeProfileMenu() {
  const profileWrapper = document.getElementById("profile-wrapper");
  if (!profileWrapper || profileWrapper.dataset.initialized) return;
  profileWrapper.dataset.initialized = "true";
  const token = getToken();

  const loginButton = document.getElementById("login-button");
  const profileMenu = document.getElementById("profile-menu");
  const profileTrigger = document.getElementById("profile-trigger");
  const logoutBtn = document.getElementById("logout-btn");

  if (token) {
    if (loginButton) loginButton.style.display = "none";
    if (profileWrapper) profileWrapper.style.display = "flex";
  } else {
    if (loginButton) loginButton.style.display = "inline-block";
    if (profileWrapper) profileWrapper.style.display = "none";
  }

  profileTrigger?.addEventListener("click", () => {
    profileMenu?.classList.toggle("hidden");
    profileTrigger.setAttribute("aria-expanded", String(!profileMenu?.classList.contains("hidden")));
  });

  logoutBtn?.addEventListener("click", () => {
    logout();

    window.location.replace(PAGES.login);
  });
}

document.addEventListener("DOMContentLoaded", initializeProfileMenu);
window.addEventListener("component:loaded", initializeProfileMenu);

document.addEventListener("click", event => {
  const profileWrapper = document.getElementById("profile-wrapper");
  const profileMenu = document.getElementById("profile-menu");

  if (!profileWrapper || !profileMenu) return;

  if (!profileWrapper.contains(event.target)) {
    profileMenu.classList.add("hidden");
    document.getElementById("profile-trigger")?.setAttribute("aria-expanded", "false");
  }
});
