let startInProgress = false;

document.addEventListener('DOMContentLoaded', () => {
    const countryButton = document.getElementById("country-mode-button");
    const pointsButton = document.getElementById("points-mode-button");
    const ffaButton = document.getElementById("ffa-mode-button");

    countryButton?.addEventListener('click', () => {
        startPointsMode();
    });

    pointsButton?.addEventListener('click', () => {
        window.location.href = "/party/create.html";
    });

    ffaButton?.addEventListener('click', () => {
        window.location.href = "/party/create.html";
    });
});

window.addEventListener("pageshow", () => {
    startInProgress = false;
    const modeButton = document.getElementById("country-mode-button");
    if (modeButton) modeButton.disabled = false;
    setLoadingScreenActive(false);
});

async function startPointsMode() {
    if (startInProgress) return;

    startInProgress = true;
    const modeButton = document.getElementById("country-mode-button");
    modeButton.disabled = true;
    setLoadingScreenActive(true);

    const res = await startCountryGameRes(gameData.map.srcName, roundLength);
    const data = await res.json();

    if (!res.ok || !data.gameId) {
        console.error("Failed to start game", data);
        startInProgress = false;
        modeButton.disabled = false;
        setLoadingScreenActive(false);
        return;
    }

    // Redirect immediately
    window.location.href = `/play/${data.gameId}`;
}

function setLoadingScreenActive(value) {
    const screen = document.getElementById('loading-screen');

    if (value) {
        // Disable transition to show it instantly
        screen.style.transition = 'none';
        screen.style.opacity = '1';
        screen.style.display = 'flex';
        document.body.classList.add("loading");
    } else {
        // Enable transition and fade out
        screen.style.transition = 'opacity 0.6s ease';
        screen.style.opacity = '0';
        document.body.classList.remove("loading");

        setTimeout(() => {
            screen.style.display = 'none';
        }, 600);
    }
}
