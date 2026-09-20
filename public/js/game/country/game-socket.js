import { showLoadingScreen } from "../../components/loading-screen.js";

const socket = window.GameShared.createSocket();
window.GameShared.bindTimerEvents(socket);

const gameId = document.getElementById("game-id").dataset.gameId;

// The server emits this event for every round after the first one. The
// initial page load is restored through game:get-status, but subsequent rounds
// must explicitly rebuild the country map and Street View instance.
socket.on("game:round-start", (data) => {
    gameData = data;
    resetGame();
    initializeRound(data);
    setGameState(data.state);
    hasGuessed = false;
    setRoundEndScreenActive(false);
    showLoadingScreen(false);
});

socket.on("game:guessing-over", (data) => {
    console.log("Guessing phase ended", data);

    const localGuess = data.round.guesses[data.userId];

    setGameState(data.state);

    if (localGuess) {
        showRoundInfo({
            correctCountry: data.correctCountry,
            correctCountryName: data.correctCountryName,
            guessedCountry: data.guessedCountry,
            isCorrect: data.isCorrect,
            streak: data.streak
        });

        return;
    }

    console.log("Timed out / no guess");

    showRoundInfo({
        correctCountry: data.correctCountry,
        correctCountryName: data.correctCountryName,
        streak: data.streak
    });
});

socket.on("game:end", async (data) => {
    await endGame(data);
});
