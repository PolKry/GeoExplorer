import { hideLoadingScreen, isLoadingScreenActive } from "../../components/loading-screen.js";

import {
    getToken
} from "../../utils/storage.js";

(function () {
    const shared = window.GameShared = window.GameShared || {};

    shared.formatTime = function formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(1, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    shared.createSocket = function createSocket() {
        const socket = io("/game", {
            auth: {
                token: getToken()
            }
        });

        const gameId = document.getElementById("game-id")?.dataset?.gameId;
        if (gameId) {
            socket.emit("game:join", gameId);
        }

        socket.on("connect", () => {
            console.log("Connected to server with id:", socket.id);
        });

        socket.on("connect_error", (err) => {
            console.error("Connection failed:", err);
        });

        return socket;
    };

    shared.whenMapsReady = function whenMapsReady(timeout = 15000) {
        if (typeof google !== "undefined" && google.maps?.StreetViewPanorama && google.maps?.Map) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const started = Date.now();
            const check = () => {
                if (typeof google !== "undefined" && google.maps?.StreetViewPanorama && google.maps?.Map) {
                    resolve();
                } else if (Date.now() - started >= timeout) {
                    reject(new Error("Google Maps API did not finish loading"));
                } else {
                    setTimeout(check, 25);
                }
            };
            check();
        });
    };

    shared.bindTimerEvents = function bindTimerEvents(socket) {
        const timerEl = document.getElementById("time-info");
        if (!timerEl || !socket) return;

        socket.on("timer:start", ({ remaining }) => {
            console.log("timer:start", remaining);
            timerEl.textContent = shared.formatTime(remaining);
            setTimerActive(true);
        });

        socket.on("timer:tick", ({ remaining }) => {
            console.log("timer:tick", remaining);
            timerEl.textContent = shared.formatTime(remaining);
        });

        socket.on("timer:end", () => {
            console.log("timer:end");
            timerEl.textContent = "0:00";
        });
    };

    shared.initStreetView = function initStreetView({ gameData, roundPanoId, allowPanoFocus = false, setBlocker = false }) {
        const streetViewPanel = document.getElementById("street-view");
        if (!streetViewPanel) return null;

        const panoramaInstance = new google.maps.StreetViewPanorama(streetViewPanel, {
            pano: roundPanoId,
            zoom: 0,
            clickToGo: gameData.gameplayMode === "moving",
            linksControl: gameData.gameplayMode === "moving",
            scrollwheel: gameData.gameplayMode !== "nmpz",
            panControl: gameData.gameplayMode !== "nmpz",
            zoomControl: false,
            keyboardShortcuts: false,
            gestureHandling: "none",
            disableDefaultUI: true,
            addressControl: false,
            fullscreenControl: false,
            showRoadLabels: false,
        });

        let isResetting = false;
        let lockedPov = null;

        panoramaInstance.addListener("status_changed", () => {
            if (panoramaInstance.getStatus() !== "OK") return;
            hideLoadingScreen();

            if (gameData.gameplayMode === "nmpz") {
                lockedPov = panoramaInstance.getPov();
            }
        });

        panoramaInstance.addListener("pano_changed", () => {
            if (isResetting) return;
            const currentPano = panoramaInstance.getPano();

            if (allowPanoFocus && currentPano !== roundPanoId) {
                isResetting = true;
                panoramaInstance.setPano(roundPanoId);
                setTimeout(() => { isResetting = false; }, 0);
            }
        });

        panoramaInstance.addListener("pov_changed", () => {
            if (gameData.gameplayMode !== "nmpz") return;
            if (!lockedPov || isResetting) return;

            const pov = panoramaInstance.getPov();
            if (pov.heading !== lockedPov.heading || pov.pitch !== lockedPov.pitch) {
                isResetting = true;
                panoramaInstance.setPov(lockedPov);
                setTimeout(() => { isResetting = false; }, 0);
            }
        });

        panoramaInstance.addListener("zoom_changed", () => {
            if (gameData.gameplayMode !== "nmpz") return;
            if (isResetting) return;

            if (panoramaInstance.getZoom() !== 0) {
                isResetting = true;
                panoramaInstance.setZoom(0);
                setTimeout(() => { isResetting = false; }, 0);
            }
        });

        if (setBlocker && gameData.gameplayMode === "nmpz") {
            shared.setStreetViewBlocked(true);
        }

        return panoramaInstance;
    };

    shared.initGuessMap = function initGuessMap({ onGuessPlaced, onMapReady }) {
        const guessMapEl = document.getElementById("guess-map");
        if (!guessMapEl) return null;

        const guessMap = new google.maps.Map(guessMapEl, {
            zoom: 1,
            center: { lat: 0, lng: 0 },
            disableDefaultUI: true,
            draggableCursor: "crosshair",
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

        guessMap.addListener("click", function (e) {
            const guessLocation = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            if (typeof onGuessPlaced === "function") {
                onGuessPlaced(guessLocation, guessMap);
            }
        });

        guessMap.addListener("click", function (event) {
            if (event.placeId) {
                event.stop();
            }
        });

        if (typeof onMapReady === "function") {
            onMapReady(guessMap);
        }

        return guessMap;
    };

    // Place (or replace) the player's guess marker consistently in every mode.
    // Returning the marker lets each mode keep its own round state without
    // duplicating Google Maps marker setup.
    shared.placeGuessMarker = function placeGuessMarker({
        map,
        previousMarker,
        location,
        socket,
        gameId,
        icon,
        title = "Your guess"
    }) {
        if (!map || !location || typeof google === "undefined" || !google.maps) {
            return previousMarker || null;
        }

        previousMarker?.setMap(null);

        const marker = new google.maps.Marker({
            position: location,
            map,
            title,
            cursor: "crosshair",
            clickable: false,
            icon
        });

        if (socket && gameId) {
            socket.emit("game:update-marker", {
                gameId,
                position: { lat: location.lat, lng: location.lng }
            });
        }

        return marker;
    };

    shared.setStreetViewBlocked = function setStreetViewBlocked(blocked) {
        const blocker = document.getElementById("blocker");
        if (!blocker) return;
        blocker.style.display = blocked ? "block" : "none";
    };

    shared.isLoadingScreenActive = isLoadingScreenActive();
    

    shared.submitGuess = function submitGuess({ socket, gameId, guessLocation, guessMarker, hasGuessed, panorama, setHasGuessed }) {
        if (!guessMarker || hasGuessed || !guessLocation) return;

        if (typeof setHasGuessed === "function") {
            setHasGuessed(true);
        }

        socket.emit("game:submit-guess", {
            gameId,
            lat: guessLocation.lat,
            lng: guessLocation.lng,
            panoId: panorama.getPano()
        });
    };

    shared.bindZoomToCountry = function bindZoomToCountry({ gameData, map, geocoder }) {
        if (!gameData?.map || !map) return;

        geocoder.geocode({ address: gameData.map.name }, (results, status) => {
            if (status === "OK") {
                const bounds = results[0].geometry.bounds || results[0].geometry.viewport;
                map.fitBounds(bounds);
                const currentZoom = map.getZoom();
                map.setZoom(currentZoom + 2);
            } else {
                console.log("Geocode was not successful: " + status);
            }
        });
    };

    shared.applyRoundBounds = function applyRoundBounds({ resultMap, location, allGuesses }) {
        if (!resultMap) return;

        const bounds = new google.maps.LatLngBounds();
        bounds.extend(new google.maps.LatLng(location.lat, location.lng));

        if (allGuesses && Object.keys(allGuesses).length > 0) {
            for (const guess of Object.values(allGuesses)) {
                if (typeof guess.guess?.lat === "number" && typeof guess.guess?.lng === "number") {
                    bounds.extend(new google.maps.LatLng(Number(guess.guess.lat), Number(guess.guess.lng)));
                }
            }
            resultMap.fitBounds(bounds, { padding: 200 });
            return;
        }

        resultMap.setCenter(location);
        resultMap.setZoom(7);
    };
})();
