import {
    getToken,
    getPartyHostId,
    getPartyCode
} from "../../utils/storage.js";

// Audio
let enabledSound = true;
let effectVolume = 0.5;

// Maps
let mapName;
let guessMarker;
let map;
let endingMap;
let panorama;
let hasGuessed;
let gameData;
let roundTime;
let actualLocationMarker = null;
let usersLocationMarker = null;
let resultMap = null;
let guessLocation;
let historyCountries = [];
let responsive;

let playerColor = "#007BFF";

const breakdownGrayIcon = "/resources/images/BreakdownGray.png";
const breakdownWhiteIcon = "/resources/images/BreakdownWhite.png";

const submitGuessButton = document.getElementById("guess-button");

function getCurrentUserId() {
    const token = getToken();
    if (!token) return null;

    try {
        return JSON.parse(atob(token.split('.')[1])).userId;
    } catch (err) {
        console.error("Failed to read current user id", err);
        return null;
    }
}

function redirectBackToParty() {
    const currentUserId = getCurrentUserId();
    const hostId = getPartyHostId();

    if (hostId && currentUserId && String(currentUserId) === String(hostId)) {
        window.location.href = "/party/create.html";
        return;
    }

    if (getPartyCode()) {
        window.location.href = "/party/waiting-room.html";
        return;
    }

    window.location.href = "/";
}

document.addEventListener("DOMContentLoaded", async () => {
    // Keyboard shortcuts
    // TODO: Checkpoint, Move to start
    document.addEventListener('keypress', async (e) => {
        if (e.code !== 'Space')
            return;

        e.preventDefault();
        e.stopPropagation();
        if (!gameData || window.GameShared.isLoadingScreenActive())
            return;

        console.log(gameData.state, guessMarker?.getMap());
        if (gameData.state === "in_round" && guessMarker?.getMap()) {
            submitGuess();
            return;
        }

        if (gameData.state === "all_guessed") {
            proceed();
            return;
        }

        if (gameData.state === "game_ended") {
            await backBtnClick();
            return;
        }
    });
});

function loadGame(gameId) {
    setLoadingScreenActive(true);
    setTimerActive(false);

    if (!gameData)
        return;

    socket.emit('game:get-status', { gameId }, (data) => {
        console.log("Loaded game data:", data);
        gameData = data;

        initGameData(data);
    });
}

function initGameData(data) {
    const roundInfo = document.getElementById('round-info');
    const mapInfo = document.getElementById('map-info');

    playerColor = data.players.find(p => String(p.id) === String(data.userId)).color;
    console.log("Player color:", playerColor);

    if (data.map)
        mapInfo.textContent = data.map.name;

    roundInfo.textContent = `${data.roundIndex} / ${data.maxRounds}`;
}

function initStreetView(roundPanoId) {
    panorama = window.GameShared.initStreetView({
        gameData,
        roundPanoId,
        allowPanoFocus: gameData.gameplayMode !== "moving",
        setBlocker: true
    });
}

function initGuessMap() {
    map = window.GameShared.initGuessMap({
        onGuessPlaced: (location, guessMap) => {
            map = guessMap || map;
            guessLocation = location;
            guessMarker = window.GameShared.placeGuessMarker({
                map,
                previousMarker: guessMarker,
                location,
                socket,
                gameId: window.GAME_ID,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: playerColor,
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 2
                }
            });
            playSound("markerPlacedLand.mp3", effectVolume);
            const guessButton = document.getElementById('guess-button');
            guessButton.disabled = false;
        },
        onMapReady: () => initGeocoder(gameData)
    });
}

function initGeocoder(gameData) {
    if (!gameData.map)
        return;

    if (gameData.map.type != "Official")
        return;

    const geocoder = new google.maps.Geocoder();
    window.GameShared.bindZoomToCountry({ gameData, map, geocoder });
}

function submitGuess() {
    console.log("Submitting guess:", guessLocation);

    window.GameShared.submitGuess({
        socket,
        gameId: window.GAME_ID,
        guessLocation,
        guessMarker,
        hasGuessed,
        panorama,
        setHasGuessed: (value) => {
            hasGuessed = value;
            submitGuessButton.disabled = value;
        }
    });
}

function addMarkerToHistory(guessLocation, actualLocation) {
    historyCountries.push({
        guessed: guessLocation,
        actual: actualLocation
    });
}

const proceedButton = document.getElementById("proceed-button");
proceedButton.addEventListener("click", proceed);

function proceed() {
    const currentUserId = getCurrentUserId();
    const hostId = getPartyHostId();

    if (hostId && currentUserId && String(currentUserId) === String(hostId)) {
        setRoundEndScreenActive(false);
        setLoadingScreenActive(true);

        socket.emit('game:end-round', { gameId: GAME_ID });
    }
}

async function endGame(info) {
    console.log("Ending the game")

    roundTime = info.roundTime;

    setGameState(info.state);

    initEndingMap();
    setEndingScreenActive(true);
    setLoadingScreenActive(false);

    loadMarkersFromHistory();

    renderFFAPlayers("final-results-list", info.players || []);
}

function setGameState(newState) {
    console.log("Setting game state to:", newState);
    gameData.state = newState;
}

function resetGame() {
    guessLocation = null;
    hasGuessed = false;

    // Resets markers
    if (actualLocationMarker)
        actualLocationMarker.setMap(null);
    if (usersLocationMarker)
        usersLocationMarker.setMap(null);

    if (guessMarker)
        guessMarker.setMap(null);
}

// Shows the round info
function showRoundInfo({ distance, points, location, allGuesses, players, userId, hostId }) {
    const distanceText = document.getElementById('info-text');
    const pointsText = document.getElementById('points-text');

    if (distance)
        distanceText.textContent = `You are ${formatDistance(distance)} away!`;

    animateScore(points || 0, pointsText, " Points");

    initResultMap();
    drawVisuals(location, allGuesses, players);

    renderFFAPlayers("round-results-list", players, userId, allGuesses);

    // Determine if current user is the party host
    const isHost = String(userId) === String(hostId);
    setProceedActive(isHost);

    setRoundEndScreenActive(true);

    // Play SFX
    playSound("answersShow.mp3", effectVolume);

    const bounds = new google.maps.LatLngBounds();

    bounds.extend(
        new google.maps.LatLng(location.lat, location.lng)
    );

    if (allGuesses && Object.keys(allGuesses).length > 0) {

        for (const guess of Object.values(allGuesses)) {
            if (
                typeof guess.guess?.lat === "number" &&
                typeof guess.guess?.lng === "number"
            ) {
                bounds.extend(
                    new google.maps.LatLng(
                        Number(guess.guess?.lat),
                        Number(guess.guess?.lng)
                    )
                );
                console.log(bounds.toJSON(), location, guess);
            }
        }
        resultMap.fitBounds(bounds, { padding: 200 });

    } else {
        resultMap.setCenter(location);
        resultMap.setZoom(7);
    }
}

function setProceedActive(isHost) {
    const proceedButton = document.getElementById('proceed-button');
    const waitingText = document.getElementById('waiting-for-host-to-proceed');

    if (isHost) {
        proceedButton.style.display = "block";
        waitingText.style.display = "none";
    } else {
        waitingText.style.display = "flex";
        proceedButton.style.display = "none";
    }
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
    const distanceText = document.getElementById('info-text');

    if (value) {
        locationPanel.style.visibility = 'visible';
        distanceText.style.visibility = "visible";
    } else {
        distanceText.style.visibility = "hidden";
        locationPanel.style.visibility = 'hidden';
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

function setLoadingScreenActive(value) {
    const screen = document.getElementById('loading-screen');

    if (value) {
        screen.style.transition = 'none';
        screen.style.opacity = '1';
        screen.style.display = 'flex';
        screen.style.pointerEvents = 'auto';
    } else {
        screen.style.transition = 'opacity 0.6s ease';
        screen.style.opacity = '0';
        screen.style.pointerEvents = 'none';

        setTimeout(() => {
            screen.style.display = 'none';
        }, 600);
    }
}

function renderFFAPlayers(containerId, players, currentUserId = null, roundGuesses = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    console.log("Rendering FFA players:", players, currentUserId, roundGuesses);

    const isFinalResults = containerId === "final-results-list";
    const sortedPlayers = [...players]
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 5);

    const summaryScore = document.getElementById("ffa-ending-summary-score");
    if (summaryScore && isFinalResults) {
        const topPlayerScore = Number(sortedPlayers[0]?.score ?? 0).toLocaleString();
        summaryScore.textContent = `${topPlayerScore} pts`;
    }

    let previousPoints = null;
    let currentRank = 1;

    container.innerHTML = sortedPlayers.map((player, index) => {
        const playerId = String(player.id);
        const guessEntry = roundGuesses instanceof Map
            ? roundGuesses.get(playerId) ?? null
            : roundGuesses?.[playerId] ?? null;

        const points = roundGuesses != null
            ? (guessEntry ? (guessEntry.points ?? 0) : 0)
            : (player.score ?? 0);
        const distance = roundGuesses != null
            ? (guessEntry ? (guessEntry.distance ?? null) : null)
            : (player.lastDistance ?? null);

        const distanceText = distance == null
            ? "Didn't guess!"
            : `${(Number(distance) / 1000).toFixed(1)} km away`;
        const isMe = currentUserId && String(player.id) === String(currentUserId);
        const rowClasses = ["ffa-player-row", isMe ? "me" : "", isFinalResults ? "ffa-final-row" : "", index === 0 && isFinalResults ? "top-player" : ""]
            .filter(Boolean)
            .join(" ");
        const scoreValue = Number(points).toLocaleString();
        const secondaryText = isFinalResults ? "Overall score" : distanceText;

        if (previousPoints === null || points !== previousPoints) {
            currentRank = index + 1;
        }

        previousPoints = points;

        return `
        <div class="${rowClasses}">
            <div class="ffa-player-place">#${currentRank}</div>

            <div class="ffa-player-main">
                <span class="ffa-player-name" style="color: ${player.color}">
                    ${(isMe ? " (You) " : "") + player.username}
                </span>
                <span class="ffa-player-distance">${secondaryText}</span>
            </div>

            <div class="ffa-player-score">
                <span class="ffa-player-score-value">${scoreValue}</span>
                ${isFinalResults ? '<span class="ffa-player-score-label">pts</span>' : ""}
            </div>
        </div>
    `;
    }).join("");
}

let popupTimeout;

function showGuessedPlayer(player) {
    const popup = document.getElementById("guess-status-popup");
    console.log(popup);
    popup.textContent = `${player.username} guessed!`;

    popup.style.opacity = "1";
    popup.style.transform = "translateX(-50%) translateY(0)";

    clearTimeout(popupTimeout);
    popupTimeout = setTimeout(() => {
        popup.style.opacity = "0";
        popup.style.transform = "translateX(-50%) translateY(-10px)";
    }, 2500);
}

function initResultMap() {
    resultMap = new google.maps.Map(document.getElementById("answer-map"), {
        zoom: 1,
        center: { lat: 0, lng: 0 },
        disableDefaultUI: true,
        draggableCursor: 'crosshair',
        disableDoubleClickZoom: true
    });
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
}

function drawVisuals(actualLoc, allGuesses = {}, players = []) {
    // Markers
    if (actualLocationMarker)
        actualLocationMarker.setMap(null);
    if (usersLocationMarker)
        usersLocationMarker.setMap(null);


    actualLocationMarker = new google.maps.Marker({
        position: { lat: actualLoc.lat, lng: actualLoc.lng },
        map: resultMap,
        title: "Actual Location",
        cursor: 'pointer',
        icon: {
            url: "/resources/images/ActualLocation.png",
            scaledSize: new google.maps.Size(30, 30)
        },
    });

    actualLocationMarker.addListener("click", () => {
        const { lat, lng } = actualLoc;
        const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
        window.open(url, "_blank");
        document.activeElement?.blur();
    });

    if (guessLocation == null)
        return;

    Object.entries(allGuesses).forEach(([playerId, guessData]) => {
        const guess = guessData.guess;
        if (!guess || typeof guess.lat !== "number") return;
        const player = players.find(p => String(p.id) === String(playerId));
        console.log(player?.username, player?.color);
        const color = player?.color || "#007BFF"; // fallback

        new google.maps.Marker({
            position: { lat: guess.lat, lng: guess.lng },
            map: resultMap,
            title: player?.username || "Player",
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: color,
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2
            }
        });
    });

    const guessLatLng = toLatLngLiteral(guessLocation);
    const actualLatLng = toLatLngLiteral({ lat: actualLoc.lat, lng: actualLoc.lng });

    // Line
    const line = new google.maps.Polyline({
        path: [guessLatLng, actualLatLng],
        geodesic: false,
        strokeColor: "#007BFF",
        strokeOpacity: 0,
        strokeWeight: 3,
        cursor: 'crosshair',
        icons: [{
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillOpacity: 1,
                fillColor: "#007BFF",
                strokeOpacity: 0,
                scale: 2
            },
            offset: '0',
            repeat: '10px'
        }],
    });

    line.setMap(resultMap);
}

function loadMarkersFromHistory() {
    historyCountries.forEach(position => {
        console.log("Adding markers for:", position);

        new google.maps.Marker({
            position: position.guessed,
            map: endingMap,
            title: "Your guess",
            cursor: 'crosshair',
            icon: {
                url: "/resources/images/GuessedLocation.png",
                scaledSize: new google.maps.Size(29, 30)
            }
        });

        const actualMarker = new google.maps.Marker({
            position: position.actual,
            map: endingMap,
            title: "Actual Location",
            cursor: 'pointer',
            icon: {
                url: "/resources/images/ActualLocation.png",
                scaledSize: new google.maps.Size(29, 30)
            }
        });

        actualMarker.addListener("click", () => {
            const { lat, lng } = position.actual;
            const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
            window.open(url, "_blank");
            document.activeElement?.blur();
        });

        // Line between markers
        const guessLatLng = toLatLngLiteral(position.guessed);
        const actualLatLng = toLatLngLiteral(position.actual);

        const line = new google.maps.Polyline({
            path: [guessLatLng, actualLatLng],
            geodesic: false,
            strokeColor: "#007BFF",
            strokeOpacity: 0,
            strokeWeight: 3,
            cursor: 'crosshair',
            icons: [{
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillOpacity: 1,
                    fillColor: "#007BFF",
                    strokeOpacity: 0,
                    scale: 2
                },
                offset: '0',
                repeat: '10px'
            }],
        });

        line.setMap(endingMap);
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
        img.src = breakdownGrayIcon;
        map.classList.remove('responsive');
    } else {
        overlay.style.visibility = "visible";
        infoPanel.style.visibility = "visible";
        img.src = breakdownWhiteIcon;
        map.classList.add('responsive');
    }

    img.classList.remove('pop-animation');
    void img.offsetWidth;
    img.classList.add('pop-animation');
}

document.getElementById('back-button')?.addEventListener('click', backBtnClick);
async function backBtnClick() {
    resetGame();

    setLoadingScreenActive(true);

    if (gameData.state !== "game_ended")
        return;

    redirectBackToParty();
}

function playSound(src, volume = 1) {
    if (!enabledSound)
        return;

    const audio = new Audio(audioPath + src);
    audio.volume = volume;
    audio.play();
}
