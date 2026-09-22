import { hideLoadingScreen } from "../../components/loading-screen.js";

const socket = window.GameShared.createSocket();
window.GameShared.bindTimerEvents(socket);

const gameId = document.getElementById("game-id").dataset.gameId;

// Subsequent rounds are delivered over the socket after the first round.
socket.on("game:round-start", async (data) => {
    await window.GameShared.whenMapsReady();
    gameData = data;
    resetGame();
    initGameData(data);
    initStreetView(data.roundPanoId);
    initGuessMap();
    setGameState(data.state);
    hasGuessed = false;
    setRoundEndScreenActive(false);
    hideLoadingScreen();
});

socket.on("game:guessing-over", (data) => {
    console.log("Guessing phase ended");

    const localGuess = data.round.guesses[data.userId];
    console.log(data, data.location, localGuess);

    setGameState(data.state);

    if (localGuess) {
        addMarkerToHistory(guessLocation, data.location);

        showRoundInfo({
            distance: localGuess.distance,
            points: localGuess.points,
            location: data.location,
            allGuesses: data.round.guesses
        });

        return;
    }

    console.log("Timed out / no guess");

    showRoundInfo({
        location: data.location,
        allGuesses: data.round.guesses
    });
});

socket.on("game:end", async (data) => {
    await endGame(data);
});
