// game/GameEngine.js
const EventEmitter = require("events");

const { getGameClass } = require("../game/getGameClass");
const Player = require("./Player");
const Round = require("./Round");
const GameState = require("./GameState");
const PartyManager = require("../managers/party.manager");
const GameManager = require("../managers/game.manager");

/*
    Represents the core game engine, handling game logic,
    progression and overall game flow
*/
class GameEngine extends EventEmitter {
    constructor(gameId, mode, gameplayMode, partyId, state = "starting") {
        super();

        this.gameId = gameId;
        this.partyId = partyId;

        this.mode = mode;
        this.gameplayMode = gameplayMode;

        this.players = [];
        this.teams = [];
        this.round = null;
        this.rounds = [];
        this.roundIndex = 0;

        this.state = state;

        // Last time when a player was in it
        this.lastActiveAt = Date.now();

        // Stores last marker positions for fallback guesses
        this.lastMarkerPositions = new Map();
    }

    // Updates player's marker position (only in location mode)
    updateMarkerPosition(userId, position) {
        this.lastMarkerPositions.set(userId.toString(), position);
    }

    // Returns final guesses for all players (handles fallback cases)
    getFinalGuesses() {
        const finalGuesses = new Map();

        for (const player of this.players) {
            const playerId = player.id.toString();

            if (this.round.guesses.has(playerId)) {
                finalGuesses.set(playerId, this.round.guesses.get(playerId));
            }

            // fallback marker guess (location mode only)
            else if (
                this.gameplayMode === "location" &&
                this.lastMarkerPositions.has(playerId)
            ) {
                const pos = this.lastMarkerPositions.get(playerId);

                finalGuesses.set(playerId, {
                    guess: { lat: pos.lat, lng: pos.lng },
                    distance: null,
                    points: 0,
                    timedOut: true
                });
            }

            else {
                finalGuesses.set(playerId, {
                    guess: null,
                    distance: null,
                    points: 0,
                    timedOut: true
                });
            }
        }

        return finalGuesses;
    }

    // Returns current game state
    getState() {
        return this.state;
    }

    // Updates game state
    setState(state) {
        this.state = state;
    }

    setIdle(value) {
        if (value) {
            this.setState(GameState.IDLE);
        } else {
            // TODO: If guessed, strat a new round
            this.setState(GameState.IN_ROUND);
        }
    }

    // Adds a player to the game
    addPlayer(player) {
        if (this.getPlayer(player.id)) return;
        this.players.push(player);
    }

    // Removes a player from a game and sends a confirmation boolean
    removePlayer(userId) {
        const before = this.players.length;

        this.players = this.players.filter(
            p => String(p.id) !== String(userId)
        );

        return this.players.length !== before; // True if removed
    }

    toPublicPlayer(player) {
        const { totalDistance, lastDistance, totalScore, score, streak, ...rest } = player;
        return rest;
    }

    // Adds a team to the game
    addTeam(team) {
        this.teams.push(team);
    }

    getSinglePlayer() {
        return this.players[0];
    }

    getHostId() {
        const hostPlayer = this.players[0];
        return hostPlayer ? hostPlayer.id : null;
    }

    // Returns current round index
    getRoundIndex() {
        return this.roundIndex;
    }

    shouldEndRoundImmediately() {
        return this.mode.shouldEndRoundImmediately();
    }

    // Starts the game and initializes first rounds
    async startGame() {
        if (this.state !== GameState.STARTING) return;

        this.mode.onGameStart(this);

        this.rounds = [];
        this.roundIndex = 0;

        // Generate current round
        this.rounds[0] = await this.mode.generateRound();

        // Pre-generate next round
        await this.ensureNextRoundGenerated();
        // Start first round
        await this.nextRound();
    }

    // Ensures the next round is pre-generated (for performance)
    async ensureNextRoundGenerated() {
        const nextIndex = this.roundIndex + 1;

        // Skip if already generated or game ending
        if (
            this.rounds[nextIndex] ||
            nextIndex >= this.mode.maxRounds
        ) {
            return;
        }

        const round = await this.mode.generateRound();
        this.rounds[nextIndex] = round;
    }

    // Generates only the first round (used in some cases)
    async generateFirstRound() {
        this.rounds = [];

        const round = await this.mode.generateRound();
        this.rounds.push(round);
    }

    // Starts the next round
    async nextRound() {
        if (
            this.state !== GameState.STARTING &&
            this.state !== GameState.ROUND_ENDED
        ) return;

        this.round = this.getCurrentRound();
        this.setState(GameState.IN_ROUND);

        this.mode.onRoundStart(this, this.round);

        console.log(
            "START ROUND",
            this.roundIndex,
            "object id:",
            this.round,
            "rounds id:",
            this.rounds
        );

        // Save the round start time
        // If party has "waitForFirstGuess", don't set startedAt here — timer will start on first guess
        if (this.partyId) {
            const party = await PartyManager.getById(this.partyId).catch(() => null);
            if (!party || !party.settings || !party.settings.waitForFirstGuess) {
                this.round.startedAt = Date.now();
            }
        } else {
            this.round.startedAt = Date.now();
        }
    }

    // Returns the current round object
    getCurrentRound() {
        return this.rounds[this.roundIndex] ?? null;
    }

    // Handles player guess submission
    submitGuess(userId, guess) {
        if (this.getState() !== GameState.IN_ROUND) return;

        this.mode.onGuess(this, userId, guess);

        this.addTimeToPlayer(userId, Date.now() - this.round.startedAt);
    }

    // Ends guessing phase
    endGuessing() {
        if (this.getState() !== GameState.IN_ROUND) return;

        this.setState(GameState.GUESSING_OVER);
        this.mode.onGuessingOver(this);
    }

    // Ends current round and prepares next one
    async endRound() {
        if (this.getState() !== GameState.GUESSING_OVER) return;

        this.setState(GameState.ROUND_ENDED);
        this.mode.onRoundEnd(this);

        // Ends for all
        this.round.endedAt = Date.now();

        // Clear stored marker positions
        this.lastMarkerPositions.clear();
        // Save updated round
        this.rounds[this.roundIndex] = this.round;
        // Move to next round
        this.roundIndex++;

        // Check if game is finished
        if (this.isGameFinished()) {
            this.endGame();
            return;
        }

        // Preload next round
        await this.ensureNextRoundGenerated().catch(console.error);
    }

    // Ends the game (before finalization)
    endGame() {
        if (this.getState() !== GameState.ROUND_ENDED) return;

        this.lastMarkerPositions.clear();

        console.log("Ending this game");

        this.setState(GameState.GAME_ENDED);
        this.mode.onGameEnd(this);

        this.emit("gameEnded", {
            partyId: this.partyId,
            results: this.getFinalResults()
        });
    }

    // Finalizes the game (final state)
    finishGame() {
        console.log("Finishing this game");

        this.setState(GameState.FINISHED);
        this.mode.onGameFinish(this);
    }

    // Recreates game engine from a database session
    static loadFromSession(session) {
        if (!session.gameId) {
            throw new Error("Invalid session: missing gameId");
        }

        const GameModeClass = getGameClass(session.mode);

        const engine = new GameEngine(
            session.gameId,
            GameModeClass.fromSession(session),
            session.gameplayMode,
            session.partyId,
            session.state
        );

        engine.on("gameEnded", async ({ partyId, results }) => {
            console.log("Game ended with results:", results);
            const party = await PartyManager.getById(partyId);
            if (!party) return;

            party.clearGame();
            await party.persist();

            GameManager.remove(gameId);
            //io.to(partyId).emit("gameEnded", results);
        });

        // Recreate players
        engine.players = (session.players || []).map(p => new Player(
            p.id.toString(),
            p.username,
            p.color,
            p.score ?? 0,
            p.streak ?? 0,
            p.totalTime ?? 0,
            p.totalDistance ?? null,
            p.lastDistance ?? null,
            p.guessedRounds ?? 0,
            p.connected ?? p.online ?? false,
            p.team ?? null
        ));

        // Recreate rounds
        engine.round = session.round ? Round.fromJSON(session.round) : null;
        engine.rounds = (session.rounds || []).map(r => Round.fromJSON(r));
        engine.roundIndex = session.roundIndex ?? 0;

        // Restore marker positions
        engine.lastMarkerPositions = new Map(
            Object.entries(session.lastMarkerPositions || {})
                .map(([id, pos]) => [
                    id,
                    { lat: Number(pos.lat), lng: Number(pos.lng) }
                ])
        );

        return engine;
    }

    // Converts JS Map to plain object (for MongoDB storage)
    mapToMongooseMap(jsMap) {
        const obj = {};
        for (const [playerId, pos] of jsMap) {
            // Skip any invalid entries
            if (!pos || typeof pos.lat !== "number" || typeof pos.lng !== "number") continue;

            obj[playerId] = {
                lat: Number(pos.lat),
                lng: Number(pos.lng)
            };
        }
        return obj;
    }

    addTimeToPlayer(userId, value) {
        const player = this.getPlayer(userId);
        if (!player) return;

        player.totalTime = (player.totalTime || 0) + value;
    }

    // Finds a player by ID
    getPlayer(userId) {
        return this.players.find(p => p.id.toString() === userId.toString());
    }

    isConnected(userId) {
        const player = this.getPlayer(userId);
        return player ? player.connected : false;
    }

    // Get all connected players including wether they have guessed or not
    getConnectedPlayers() {
        return this.players.filter(p => p.connected).map(p => ({
            ...p,
            hasGuessed: this.hasPlayerGuessed(p.id),
        }));
    }

    // Returns connected players, with their guesses
    getPlayersWithGuesses() {
        return this.getConnectedPlayers().map(p => ({
            ...p,
            guess: this.round.guesses?.get(p.id) || p.guess || null
        }));
    }

    getGuessedPlayersCount() {
        return this.round.guesses.size || 0;
    }

    // Checks if all players have guessed
    didAllPlayersGuess() {
        if (!this.round || !this.round.guesses) return false;
        return this.round.guesses.size === this.players.length;
    }

    hasPlayerGuessed(userId) {
        if (!this.round || !this.round.guesses) return false;
        return this.round.guesses.has(String(userId));
    }

    // Checks if game has finished
    isGameFinished() {
        return this.mode.isGameFinished(this);
    }

    isEmpty() {
        return this.players.length === 0;
    }

    isHost(userId) {
        const hostId = this.getHostId();
        return hostId && String(hostId) === String(userId);
    }

    // Returns final results from mode logic
    getFinalResults() {
        return this.mode.getFinalResults(this);
    }

    getWinner() {
        return this.mode.getWinner(this);
    }

    getModeName() {
        return this.mode.getModeName();
    }

    // Returns game ID
    getGameId() {
        return this.gameId;
    }

    // Checks if gameplay mode is location-based
    isLocationMode() {
        return this.mode === "location";
    }

    // Checks if gameplay mode is country-based
    isCountryMode() {
        return this.mode === "country";
    }
}

module.exports = GameEngine;