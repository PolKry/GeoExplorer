import { ICONS, AUDIO, PAGES } from "../../constants/resources.js";
import { playSound } from "../../utils/audio.js";
import { showLoadingScreen, hideLoadingScreen } from "../../components/loading-screen.js";
const { startCountryGameRes } = require("../../api/game-api");

// Maps
let mapName;
let map;
let endingMap;
let panorama;
let hasGuessed;
let gameData;
let roundTime;
let resultMap = null;
let selectedCountry = null;
let guessCountry;
let responsive;
let worldGeoJson = null;
let worldGeoJsonPromise = null;
let endingMapReady = false;

let historyCountries = [];
let gameStartInProgress = false;
let loadingScreenActive = false;

const submitGuessButton = document.getElementById("guess-button");

document.addEventListener("DOMContentLoaded", async () => {
    loadWorldGeoJson();

    // Keyboard shortcuts
    // TODO: Checkpoint, Move to start
    document.addEventListener('keypress', async (e) => {
        if (e.code !== 'Space')
            return;

        e.preventDefault();
        e.stopPropagation();
        if (!gameData || gameStartInProgress || loadingScreenActive || window.GameShared.isLoadingScreenActive())
            return;

        console.log(gameData.state);
        if (gameData.state === "in_round") {
            submitGuess();
            return;
        }

        if (gameData.state === "all_guessed") {
            proceed();
            return;
        }

        if (gameData.state === "game_ended") {
            await playAgainClick();
            return;
        }
    });
});

function loadGame(gameId) {
    showLoadingScreen();
    setTimerActive(false);

    socket.emit('game:get-status', { gameId }, (data) => {
        if (!data) {
            console.error("No game status received");
            hideLoadingScreen();
            return;
        }

        gameData = data;
        initGameData(gameData);

        if (gameData.state === "in_round") {
            initializeRound(gameData);
            return;
        }

        if (["all_guessed", "game_ended"].includes(gameData.state)) {
            hideLoadingScreen();
        }
    });

    socket.once('game:round-start', (data) => {
        gameData = data;

        initializeRound(gameData);
    });
}

async function initializeRound(data) {
    try {
        await window.GameShared.whenMapsReady();
    } catch (error) {
        console.error(error);
        hideLoadingScreen();
        return;
    }

    initGameData(data);
    initStreetView(data.roundPanoId);
    initGuessMap();
    initResultMap();
    initEndingMap();

    hideLoadingScreen();
    setTimerActive(data.isTimerStarted);
    submitGuessButton.disabled = false;
}

function initGameData(gameData) {
    const streakInfo = document.getElementById('total-streak-info');
    const mapInfo = document.getElementById('map-info');

    if (gameData.map)
        mapInfo.textContent = gameData.map.name;
    if (gameData.streak)
        streakInfo.textContent = gameData.streak;
}

function loadWorldGeoJson() {
    if (!worldGeoJsonPromise) {
        worldGeoJsonPromise = fetch("/data/World.geojson")
            .then(res => res.json())
            .then(data => {
                worldGeoJson = data;
                return data;
            });
    }

    return worldGeoJsonPromise;
}

function initStreetView(roundPanoId) {
    streetViewPanel = document.getElementById("street-view");

    panorama = new google.maps.StreetViewPanorama(streetViewPanel, {
        pano: roundPanoId,
        zoom: 0,

        clickToGo: true,
        linksControl: true,
        scrollwheel: true,
        panControl: true,
        zoomControl: false,
        keyboardShortcuts: false,
        gestureHandling: "none",

        disableDefaultUI: true,
        addressControl: false,
        fullscreenControl: false,
        showRoadLabels: false,
    });

    // Wait for pano to be fully loaded
    panorama.addListener("status_changed", () => {
        if (panorama.getStatus() !== "OK") return;

        hideLoadingScreen();
    });
}

function initGuessMap() {
    map = new google.maps.Map(document.getElementById('guess-map'), {
        zoom: 1,
        center: { lat: 0, lng: 0 },
        disableDefaultUI: true,
        draggableCursor: "crosshair",
        disableDoubleClickZoom: true,
        clickable: false,
        restriction: {
            latLngBounds: {
                north: 85,
                south: -85,
                west: -180,
                east: 180
            },
            strictBounds: true
        }
    });

    loadWorldGeoJson().then(data => {
        map.data.addGeoJson(data);
    });

    map.data.setStyle({
        fillColor: "#ffffff",
        fillOpacity: 0.05,
        strokeColor: "#606060",
        strokeWeight: 1,
        cursor: "crosshair"
    });

    map.data.addListener("click", (event) => {
        const countryCode = event.feature.getProperty("ISO_A2_EH");

        map.data.revertStyle(event.feature);

        guessCountry = countryCode;
        hasGuessed = false;

        selectedCountry = countryCode;

        map.data.setStyle(styleCountries);
    });

    map.data.addListener("mouseover", (event) => {
        const code = event.feature.getProperty("ISO_A2_EH");

        if (code === selectedCountry)
            return;

        map.data.overrideStyle(event.feature, {
            fillOpacity: 0.25
        });
    });

    map.data.addListener("mouseout", (event) => {
        map.data.revertStyle(event.feature);
    });
}

function styleCountries(feature) {
    const code = feature.getProperty("ISO_A2_EH");

    if (code === selectedCountry) {
        return {
            fillColor: "#848484",
            fillOpacity: 0.5,
            strokeColor: "#606060",
            strokeWeight: 2,
            cursor: "crosshair"
        };
    }

    return {
        fillColor: "#ffffff",
        fillOpacity: 0.05,
        strokeColor: "#767676",
        strokeWeight: 1,
        cursor: "crosshair"
    };
}

function submitGuess() {
    if (hasGuessed || !guessCountry) return;

    console.log("User guessed");

    hasGuessed = true;
    submitGuessButton.disabled = true;

    socket.emit('game:submit-guess', {
        gameId: GAME_ID,
        countryCode: guessCountry,
        panoId: panorama.getPano()
    });
}

const proceedButton = document.getElementById("proceed-button");
proceedButton.addEventListener("click", proceed);

function proceed() {
    setRoundEndScreenActive(false);
    showLoadingScreen();

    const resultText = document.getElementById('info-text');
    resultText.style.visibility = "hidden";

    socket.emit('game:end-round', { gameId: GAME_ID }, async (newRound) => {
        if (!newRound || newRound.error) {
            return;
        }
        
        resetGame();
        initGameData(newRound);
        initStreetView(newRound.roundPanoId);
        initGuessMap();
        setGameState(newRound.state);

        hasGuessed = false;
    });
}

async function endGame(info) {
    console.log("Ending the game")

    roundTime = info.roundTime;

    setGameState(info.state);

    if (endingMapReady) {
        highlightHistoryCountryPolygon();
    }

    setEndingScreenActive(true);
    hideLoadingScreen();

    const streakInfo = document.getElementById("total-streak-text");
    streakInfo.innerHTML = `
        Total Streak:<br>
        <span class="streak-value">${info.streak}</span>
    `;
}

function setGameState(newState) {
    console.log("Setting game state to:", newState);
    gameData.state = newState;
}

function resetGame() {
    guessCountry = null;
}

// Shows the round info
function showRoundInfo({ correctCountry, correctCountryName, guessedCountry, isCorrect, streak }) {
    proceedBtn.hidden = false;
    endButtons.style.display = 'none';

    const resultText = document.getElementById("info-text");
    resultText.style.visibility = "visible";
    resultText.innerHTML = isCorrect
        ? `<span id="correct-text">Correct!</span> The correct country was indeed <span class="highlight-country">${correctCountryName}</span>!`
        : `<span id="wrong-text">Wrong!</span> The correct country was <span class="highlight-country">${correctCountryName}</span>!`;

    const streakText = document.getElementById("streak-count-text");
    if (isCorrect)
        streakText.textContent = "Streak: " + streak;
    else
        streakText.textContent = "Total Streak: " + streak;

    highlightRoundCountryPolygon(correctCountry, guessedCountry);
    addCountryToHistory(correctCountry, isCorrect);
    setRoundEndScreenActive(true);

    // Play SFX
    playSound(AUDIO.showAnswer);
}

function setEndingScreenActive(value) {
    const screen = document.getElementById('ending-screen');
    const menuPanel = document.getElementById('ending-menu-panel');
    const overlay = document.getElementById('map-dark-overlay');

    if (value) {
        menuPanel.style.opacity = 1;
        screen.style.display = "flex";
        overlay.style.visibility = "visible";
        responsive = false;
    } else {
        menuPanel.style.opacity = 0;

        screen.style.display = "none";
        overlay.style.visibility = "hidden";
        responsive = false;
    }
}

function setRoundEndScreenActive(value) {
    const locationPanel = document.getElementById('answer-panel');

    if (value) {
        locationPanel.style.visibility = 'visible';
    } else {
        locationPanel.style.visibility = 'hidden';
    }
}

const endButtons = document.getElementById("end-buttons");
const proceedBtn = document.getElementById("proceed-button");

document.getElementById("play-again-answer")
    .addEventListener('click', playAgainClick);
document.getElementById("exit-answer")
    .addEventListener('click', menuClick);

function setEndStreakButtonsActive(isCorrect) {
    if (isCorrect) {
        proceedBtn.hidden = false;
        endButtons.style.display = 'none';
    } else {
        proceedBtn.hidden = true;
        endButtons.style.display = 'flex';
    }
}

function setTimerActive(value) {
    const timerPanel = document.getElementById('time-panel');

    if (value) {
        timerPanel.style.visibility = 'visible';
    } else {
        timerPanel.style.visibility = 'hidden';
    }
}

function initResultMap() {
    resultMap = new google.maps.Map(document.getElementById("answer-map"), {
        zoom: 1,
        center: { lat: 0, lng: 0 },
        disableDefaultUI: true,
        draggableCursor: 'crosshair',
        disableDoubleClickZoom: true
    });

    loadWorldGeoJson().then(data => {
        resultMap.data.addGeoJson(data);
    });

    resultMap.data.setStyle({
        fillColor: "#ffffff",
        fillOpacity: 0.05,
        strokeColor: "#606060",
        strokeWeight: 1,
        cursor: "crosshair"
    });

    resultMap.addListener('click', function (event) {
        if (event.placeId) {
            event.stop();
        }
    });
}

function highlightRoundCountryPolygon(correctISO, guessedISO) {
    if (!resultMap) return;

    const bounds = new google.maps.LatLngBounds();

    resultMap.data.setStyle((feature) => {
        const code = feature.getProperty("ISO_A2_EH");

        // Correct country
        if (code === correctISO) {
            feature.getGeometry().forEachLatLng((latLng) => {
                bounds.extend(latLng);
            });

            return {
                fillColor: "#00c853",
                fillOpacity: 0.6,
                strokeColor: "#00c853",
                strokeWeight: 2
            };
        }

        // Wrong guessed country (if different)
        if (code === guessedISO && guessedISO !== correctISO) {
            feature.getGeometry().forEachLatLng((latLng) => {
                bounds.extend(latLng);
            });

            return {
                fillColor: "#d50000",
                fillOpacity: 0.6,
                strokeColor: "#d50000",
                strokeWeight: 2
            };
        }

        return {
            fillOpacity: 0,
            strokeOpacity: 0
        };
    });

    setTimeout(() => {
        if (!bounds.isEmpty()) {
            resultMap.fitBounds(bounds, { padding: 200 });
        }
    }, 50);
}

const countryMap = new Map();
function highlightHistoryCountryPolygon() {
    if (!endingMap) return;

    const bounds = new google.maps.LatLngBounds();

    // Precompute lookup map (O(n))
    historyCountries.forEach(({ countryISO, isCorrect }) => {
        countryMap.set(countryISO, isCorrect);
    });

    endingMap.data.setStyle((feature) => {
        const code = feature.getProperty("ISO_A2_EH");

        // O(1) lookup
        const isCorrect = countryMap.get(code);

        if (isCorrect !== undefined) {
            feature.getGeometry().forEachLatLng((latLng) => {
                bounds.extend(latLng);
            });

            return {
                fillColor: isCorrect ? "#00c853" : "#d50000",
                fillOpacity: 0.6,
                strokeColor: isCorrect ? "#00c853" : "#d50000",
                strokeWeight: 2
            };
        }

        return {
            fillOpacity: 0,
            strokeOpacity: 0
        };
    });

    setTimeout(() => {
        if (!bounds.isEmpty()) {
            endingMap.fitBounds(bounds, { padding: 200 });
        }
    }, 50);
}

function addCountryToHistory(countryISO, isCorrect) {
    historyCountries.push({
        countryISO,
        isCorrect
    });

    countryMap.set(countryISO, isCorrect);
}

function initEndingMap() {
    endingMap = new google.maps.Map(document.getElementById("ending-map"), {
        zoom: 1,
        center: { lat: 0, lng: 0 },
        disableDefaultUI: true,
        draggableCursor: 'crosshair',
        disableDoubleClickZoom: true,
        restriction: {
            latLngBounds: {
                north: 85,
                south: -85,
                west: -180,
                east: 180
            },
            strictBounds: true
        }
    });

    loadWorldGeoJson().then(data => {
        endingMap.data.addGeoJson(data);
        endingMapReady = true;

        if (historyCountries.length > 0) {
            highlightHistoryCountryPolygon();
        }
    });

    endingMap.data.setStyle({
        fillColor: "#ffffff",
        fillOpacity: 0.05,
        strokeColor: "#606060",
        strokeWeight: 1,
        cursor: "crosshair"
    });

    endingMap.addListener('click', function (event) {
        if (event.placeId) {
            event.stop();
        }
    });
}

document.getElementById('breakdown-button').addEventListener('click', breakDownClick);
function breakDownClick() {
    const overlay = document.getElementById('map-dark-overlay');
    const map = document.getElementById('ending-map');
    const infoPanel = document.getElementById('ending-info-panel');
    const img = document.querySelector('#breakdown-button img');

    responsive = !responsive;

    if (responsive) {
        overlay.style.visibility = "hidden";
        infoPanel.style.visibility = "hidden";
        img.src = ICONS.breakdownGrayIcon;
        map.classList.remove('responsive');
    } else {
        overlay.style.visibility = "visible";
        infoPanel.style.visibility = "visible";
        img.src = ICONS.breakdownWhiteIcon;
        map.classList.add('responsive');
    }

    img.classList.remove('pop-animation');
    void img.offsetWidth;
    img.classList.add('pop-animation');
}

document.getElementById('menu-button').addEventListener('click', menuClick);
function menuClick() {
    resetGame();

    hasGuessed = false;
    gameData = null;

    window.location.replace(PAGES.home);
}

document.getElementById('play-again-button').addEventListener('click', playAgainClick);
async function playAgainClick() {
    resetGame();

    if (gameStartInProgress || gameData?.state !== "game_ended")
        return;

    gameStartInProgress = true;

    // The final screen is above the loading layer. Hide it first so the
    // loading state is visible while the new game is being created.
    setEndingScreenActive(false);
    showLoadingScreen();

    const res = await startCountryGameRes(gameData.map.srcName, roundLength);
    const data = await res.json();

    if (!res.ok || !data.gameId) {
        console.error("Failed to start game", data);
        hideLoadingScreen();
        gameStartInProgress = false;
        return;
    }

    // Redirect immediately
    window.location.href = `/play/${data.gameId}`;
}