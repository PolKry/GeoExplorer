const normalizePath = path => path === "/index.html" ? "/" : path.replace(/\/$/, "");

function initializeHeader() {
  const header = document.querySelector(".site-header");
  if (!header || header.dataset.initialized) return;
  header.dataset.initialized = "true";

  const currentPath = normalizePath(window.location.pathname);
  header.querySelectorAll("#nav-menu a").forEach(link => {
    const linkPath = normalizePath(new URL(link.href).pathname);
    const isCurrent = linkPath === currentPath;
    link.classList.toggle("active", isCurrent);
    if (isCurrent) link.setAttribute("aria-current", "page");
  });

  const hamburger = header.querySelector("#hamburger");
  const navMenu = header.querySelector("#nav-menu");
  const closeMenu = () => {
    hamburger.classList.remove("active");
    hamburger.setAttribute("aria-expanded", "false");
    navMenu.classList.remove("active");
  };

  hamburger.addEventListener("click", () => {
    const isOpen = hamburger.classList.toggle("active");
    hamburger.setAttribute("aria-expanded", String(isOpen));
    navMenu.classList.toggle("active", isOpen);
  });

  header.querySelectorAll("#nav-menu a").forEach(link => link.addEventListener("click", closeMenu));

  const dropdownToggle = header.querySelector(".dropdown-toggle");
  const dropdown = dropdownToggle.closest(".dropdown");
  const closeDropdown = () => {
    dropdown.classList.remove("is-open");
    dropdownToggle.setAttribute("aria-expanded", "false");
  };

  dropdownToggle.addEventListener("click", () => {
    const isOpen = dropdown.classList.toggle("is-open");
    dropdownToggle.setAttribute("aria-expanded", String(isOpen));
  });

  const profileLabel = header.querySelector(".profile-trigger-label");
  profileLabel.textContent = localStorage.getItem("username") || "Account";

  document.addEventListener("click", event => {
    if (!dropdown.contains(event.target)) {
      closeDropdown();
    }
    if (!header.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeMenu();
      closeDropdown();
    }
  });
}

initializeHeader();
