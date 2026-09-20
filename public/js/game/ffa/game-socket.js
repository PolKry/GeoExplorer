import { showLoadingScreen, hideLoadingScreen } from "../../components/loading-screen.js";

const socket = window.GameShared.createSocket();
window.GameShared.bindTimerEvents(socket);

const gameId = document.getElementById("game-id").dataset.gameId;

socket.on("game:terminated", () => {
    redirectBackToParty();
});

socket.on("game:on-guess", (data) => {
    console.log("Some user has guessed");

    showGuessedPlayer(data.player);
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
            allGuesses: data.round.guesses,
            players: data.players,
            userId: data.userId,
            hostId: data.hostId
        });

        return;
    }

    console.log("Timed out / no guess");

    showRoundInfo({
        location: data.location,
        allGuesses: data.round.guesses,
        players: data.players,
        userId: data.userId,
        hostId: data.hostId
    });
});

socket.on("game:end", async (data) => {
    await endGame(data);
});

socket.on('game:round-start', async (data) => {
    await window.GameShared.whenMapsReady();
    showLoadingScreen();

    gameData = data;

    console.log("Received round start data:", data);

    resetGame();
    initGameData(data);
    initStreetView(data.roundPanoId);
    initGuessMap();
    setTimerActive(data.isTimerStarted);

    setRoundEndScreenActive(false);
    hideLoadingScreen();
});
