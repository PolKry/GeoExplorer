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

const submitGuessButton = document.getElementById("guess-button");

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

        console.log(gameData.state);
        if (gameData.state === "in_round" && guessMarker?.getMap()) {
            submitGuess();
            return;
        }

        if (gameData.state === "all_guessed") {
            await proceed();
            return;
        }

        if (gameData.state === "game_ended") {
            await playAgainClick();
            return;
        }
    });
});

function loadGame(gameId) {
    setLoadingScreenActive(true);
    setTimerActive(false);

    socket.emit('game:get-status', { gameId }, async (data) => {
        console.log("Getting game status:", data);

        if (!data) {
            console.error("No game status received");
            return;
        }

        gameData = data;
        initGameData(gameData);

        if (gameData.state === "in_round") {
            await window.GameShared.whenMapsReady();
            initStreetView(gameData.roundPanoId);
            initGuessMap();

            setLoadingScreenActive(false);
            setTimerActive(gameData.isTimerStarted);
            return;
        }

        if (gameData.state === "waiting") {
            setLoadingScreenActive(true);
            return;
        }

        if (gameData.state === "all_guessed") {
            setLoadingScreenActive(false);
            return;
        }

        if (gameData.state === "game_ended") {
            setLoadingScreenActive(false);
            return;
        }

        console.warn("Unhandled game state:", gameData.state);
    });

    socket.once('game:round-start', async (data) => {
        console.log("Round is ready");

        gameData = data;

        await window.GameShared.whenMapsReady();
        initGameData(gameData);
        initStreetView(gameData.roundPanoId);
        initGuessMap();

        setLoadingScreenActive(false);
        setTimerActive(gameData.isTimerStarted);
    });
}

function initGameData(gameData) {
    const roundInfo = document.getElementById('round-info');
    const totalPointsInfo = document.getElementById('total-points-info');
    const mapInfo = document.getElementById('map-info');

    if (gameData.map)
        mapInfo.textContent = gameData.map.name;
    if (gameData.roundIndex && gameData.maxRounds)
        roundInfo.textContent = `${gameData.roundIndex} / ${gameData.maxRounds}`;
    if (gameData.totalPoints)
        totalPointsInfo.textContent = gameData.totalPoints;
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
                    url: '/Resources/Images/GuessedLocation.png',
                    scaledSize: new google.maps.Size(29, 30)
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
    if (!gameData?.map || gameData.map.type != "Official")
        return;

    const geocoder = new google.maps.Geocoder();
    window.GameShared.bindZoomToCountry({ gameData, map, geocoder });
}

function submitGuess() {
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
    setRoundEndScreenActive(false);
    setLoadingScreenActive(true);

    const distanceText = document.getElementById('info-text');
    distanceText.style.visibility = "hidden";

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

    initEndingMap();
    setEndingScreenActive(true);
    setLoadingScreenActive(false);

    loadMarkersFromHistory();

    const totalPointsInfo = document.getElementById("total-points-text");
    const points = info.totalPoints;
    animateScore(points, totalPointsInfo);
}

function setGameState(newState) {
    console.log("Setting game state to:", newState);
    gameData.state = newState;
}

function resetGame() {
    guessLocation = null;

    // Resets markers
    if (actualLocationMarker)
        actualLocationMarker.setMap(null);
    if (usersLocationMarker)
        usersLocationMarker.setMap(null);

    if (guessMarker)
        guessMarker.setMap(null);
}

// Shows the round info
function showRoundInfo({ distance, points, location, allGuesses }) {
    const distanceText = document.getElementById('info-text');
    const pointsText = document.getElementById('points-text');

    distanceText.style.visibility = distance != null ? "visible" : "hidden";

    if (distance)
        distanceText.textContent = `You are ${formatDistance(distance)} away!`;

    console.log(points, distance, location, allGuesses);
    animateScore(points || 0, pointsText, " Points");

    initResultMap();
    drawVisuals(location);

    const proceedButton = document.getElementById('proceed-button');
    proceedButton.disabled = false;
    proceedButton.hidden = false;

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

function drawVisuals(actualLoc) {
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
            url: "/Resources/Images/ActualLocation.png",
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

    usersLocationMarker = new google.maps.Marker({
        position: guessLocation,
        map: resultMap,
        title: "Your Location",
        cursor: 'pointer',
        icon: {
            url: "/Resources/Images/GuessedLocation.png",
            scaledSize: new google.maps.Size(29, 30)
        }
    });

    usersLocationMarker.addListener("click", () => {
        const { lat, lng } = guessLocation;
        const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
        window.open(url, "_blank");
        document.activeElement?.blur();
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
                url: "/Resources/Images/GuessedLocation.png",
                scaledSize: new google.maps.Size(29, 30)
            }
        });

        const actualMarker = new google.maps.Marker({
            position: position.actual,
            map: endingMap,
            title: "Actual Location",
            cursor: 'pointer',
            icon: {
                url: "/Resources/Images/ActualLocation.png",
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
        img.src = "/Resources/Images/BreakdownGray.png";
        map.classList.remove('responsive');
    } else {
        overlay.style.visibility = "visible";
        infoPanel.style.visibility = "visible";
        img.src = "/Resources/Images/BreakdownWhite.png";
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

    window.location.replace("/");
}

document.getElementById('play-again-button').addEventListener('click', playAgainClick);
async function playAgainClick() {
    resetGame();

    setLoadingScreenActive(true);

    if (gameData.state !== "game_ended")
        return;

    const res = await apiFetch("/api/game/points-mode/start", {
        method: "POST",
        body: JSON.stringify({
            mode: "points",
            gameplayMode: gameData.gameplayMode,
            mapCode: gameData.map.srcName,
            roundTime
        })
    });

    const data = await res.json();

    if (!res.ok || !data.gameId) {
        console.error("Failed to start game", data);
        setLoadingScreenActive(false);
        return;
    }

    // Redirect immediately
    window.location.href = `/play/${data.gameId}`;
}

function playSound(src, volume = 1) {
    if (!enabledSound)
        return;

    const audio = new Audio(audioPath + src);
    audio.volume = volume;
    audio.play();
}
