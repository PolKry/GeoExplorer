let loadingScreen = null;

export function initLoadingScreen() {
    loadStyles();

    loadingScreen = document.getElementById("loading-screen");

    if (!loadingScreen) {
        loadingScreen = document.createElement("div");
        loadingScreen.id = "loading-screen";
        document.body.appendChild(loadingScreen);
    }

    loadingScreen.innerHTML = `
        <div class="spinner"></div>
        <img src="/Resources/Images/Icon.ico" alt="GeoExplorer">
        <div class="loading-text">
            Loading<span class="dots"></span>
        </div>
    `;
}

function loadStyles() {
    if (document.getElementById("loading-screen-style")) return;

    const link = document.createElement("link");
    link.id = "loading-screen-style";
    link.rel = "stylesheet";
    link.href = "/styles/loading-screen.css";

    document.head.appendChild(link);
}

export function showLoadingScreen() {
    if (!loadingScreen) initLoadingScreen();

    loadingScreen.style.transition = "none";
    loadingScreen.style.opacity = "1";
    loadingScreen.style.display = "flex";

    document.body.classList.add("loading");
}

export function hideLoadingScreen() {
    if (!loadingScreen) return;

    loadingScreen.style.transition = "opacity 0.6s ease";
    loadingScreen.style.opacity = "0";

    document.body.classList.remove("loading");

    setTimeout(() => {
        loadingScreen.style.display = "none";
    }, 600);
}