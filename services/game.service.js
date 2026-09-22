const Player = require("../game/Player");
const GameEngine = require("../game/GameEngine");

const GameManager = require("../managers/game.manager");
const statsService = require("../services/stats.service");

const GameState = require("../game/GameState");
const userRepository = require("../repositories/user.repository");
const mapRepository = require("../repositories/map.repository");
const gameSessionRepository = require("../repositories/game-session.repository");
const userStatsRepository = require("../repositories/user-stats.repository");
const userActionRepository = require("../repositories/user-action.repository");

const { getXpForLevel } = require("../utils/user-experience.utils");
const { startRoundTimer, stopRoundTimer } = require("../handlers/timer.handler");
const { normalizeRoundTime } = require("../utils/game.utils");
const { getIO } = require("../socket");
const { getGameClass } = require("../game/getGameClass");
const { getPlayerColor } = require("../utils/player-color.utils");
const PartyManager = require("../managers/party.manager");
const { ValidationError, NotFoundError } = require("../utils/app-error.utils");

/*
    Generates a random id using 2 parts
    1) Session id
    2) Mode name

    Id Example: points-69b3083d0d4c4ac5071ba333 (for points mode)
*/
function generateGameId({ _id, mode }) {
    return `${mode}-${String(_id)}`;
};

// Creates the game session and generates the gameId
async function startGame({
    mode,
    settings,
    hostUserId,
    playerIds = [],
    partyId = null
}) {
    const hostUser = await userRepository.findUserById(hostUserId);

    if (!hostUser) {
        throw new NotFoundError("Host user not found");
    }

    const normalizedSettings = normalizeGameSettings(mode, settings);

    const {
        gameplayMode,
        mapCode,
        maxRounds,
        roundTime
    } = normalizedSettings;

    const map = await mapRepository.findByCode(mapCode);

    if (!map) {
        throw new NotFoundError(`Map not found: ${mapCode}`);
    }

    const players = await userRepository.findUsersByIds(playerIds);

    const sessionPlayers = [
        {
            id: hostUser._id,
            username: hostUser.username,
            color: getPlayerColor(hostUser._id, true),
            score: 0,
            streak: 0,
            connected: true
        },
        ...players
            .filter(p => String(p._id) !== String(hostUserId))
            .map(p => ({
                id: p._id,
                username: p.username,
                color: getPlayerColor(p._id, false),
                score: 0,
                streak: 0,
                connected: true
            }))
    ];

    const session = await gameSessionRepository.create({
        mode,
        gameplayMode,
        mapId: map._id,
        mapCode,
        roundIndex: 0,
        rounds: [],
        round: null,
        state: GameState.STARTING,
        settings: {
            roundTime,
            maxRounds
        },
        players: sessionPlayers,
        partyId
    });

    session.gameId = generateGameId({
        _id: session._id,
        mode
    });

    await session.save();

    const gameData = {
        gameId: session.gameId,
        session,
        map
    };

    await startGameEngine(gameData);

    return gameData;
}
async function startGameEngine(gameData) {
    const { session, map } = gameData;

    const GameModeClass = getGameClass(session.mode);

    const gameInstance = new GameModeClass(
        session.settings.maxRounds,
        session.settings.roundTime,
        session.mapCode,
        session.mapId,
        map.maxDistance
    );

    await generateThisAndNextRound(
        gameData,
        gameInstance
    );
}

function normalizeGameSettings(mode, settings = {}) {
    const {
        gameplayMode = "moving",
        mapCode = "World",
        maxRounds = 5,
        roundTime = 60
    } = settings;

    if (!gameplayMode) {
        throw new ValidationError("Gameplay mode is required");
    }

    if (!mapCode) {
        throw new ValidationError("Map is required");
    }

    if (!Number.isInteger(maxRounds) || maxRounds <= 0) {
        throw new ValidationError("maxRounds must be a positive integer");
    }

    if (!roundTime || roundTime <= 0) {
        throw new ValidationError("roundTime must be greater than 0");
    }

    return {
        gameplayMode,
        mapCode,
        maxRounds,
        roundTime: normalizeRoundTime(roundTime)
    };
}

/*
    Generates current and next round for the game
    Creates the game engine and adds it to the GameManager for later use
    Finally it starts the game (including the timer) and sends the round payload
*/
async function generateThisAndNextRound(gameData, gameInstance) {
    const { gameId, session, map } = gameData;

    const engine = new GameEngine(gameId, gameInstance, session.gameplayMode, session.partyId);

    engine.on("gameEnded", async ({ partyId, results }) => {
        console.log("EVENT FIRED", partyId);

        const party = await PartyManager.getById(partyId);
        if (!party) return;

        party.clearGame();
        await party.persist();

        GameManager.remove(gameId);

        //io.to(partyId).emit("gameEnded", results);
    });

    GameManager.add(gameId, engine);

    // Add all players to the engine
    for (const p of session.players) {
        engine.addPlayer(new Player(p.id, p.username, p.color));
    }

    await engine.startGame();

    // Start timer immediately unless party settings require waiting for first guess.
    let shouldStart = true;
    if (session.partyId) {
        const party = await PartyManager.getById(session.partyId);
        if (party && party.settings && party.settings.waitForFirstGuess) shouldStart = false;
    }
    if (shouldStart) startTimerForRound(gameId, engine);
    await persistSession(gameId, engine);

    const io = getIO("/game");
    for (const p of session.players) {
        console.log("Sending round start payload to player:", p.username, "userId:", String(p.id));
        const payload = withTimerState(
            engine.mode.getRoundStartPayload(engine, String(p.id), map),
            engine
        );
        io.to(String(p.id)).emit("game:round-start", payload);
    }

    console.log("Game started:", gameId);
}

// Gets the status payload of a game with the passed gameId including some info about the sender
function withTimerState(payload, engine) {
    const deadline = engine.round?.timerEndsAt ? new Date(engine.round.timerEndsAt).getTime() : null;
    return {
        ...payload,
        // Five seconds represents an untimed round. Do not show an empty
        // timer shell when no server timer exists.
        isTimerStarted: Number.isFinite(engine.mode.roundTime) && Boolean(deadline),
        timer: deadline ? {
            deadline,
            remaining: Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
            serverNow: Date.now()
        } : null
    };
}

function startTimerForRound(gameId, engine) {
    if (!engine.round || !Number.isFinite(engine.mode.roundTime)) return;
    const pausedRemaining = engine.round.timerPausedRemaining;
    const duration = Number.isFinite(pausedRemaining) ? pausedRemaining : engine.mode.roundTime;
    engine.round.timerPausedRemaining = null;
    engine.round.timerEndsAt = new Date(Date.now() + duration * 1000);
    startRoundTimer(gameId, duration, timerEnded, engine.round.timerEndsAt);
}

async function getStatus(gameId, userId) {
    const engine = GameManager.get(gameId);
    if (!engine) throw new ValidationError("Game not active");

    let payload;
    if (engine.getState() === GameState.GUESSING_OVER || engine.getState() === GameState.ROUND_ENDED) {
        payload = engine.mode.getGuessEndPayload(engine, userId);
    } else if (engine.getState() === GameState.GAME_ENDED || engine.getState() === GameState.FINISHED) {
        payload = engine.mode.getGameEndPayload(engine, userId);
    } else {
        payload = engine.mode.getGameStatusPayload(engine, userId);
    }

    const markerPosition = engine.lastMarkerPositions.get(String(userId)) || null;
    const submittedGuess = engine.round?.guesses?.get(String(userId)) || null;
    payload = withTimerState({
        ...payload,
        // This is a complete render snapshot. Consumers must select a screen
        // from state rather than assuming a reconnect starts a fresh round.
        view: engine.getState(),
        markerPosition,
        submittedGuess
    }, engine);

    return {
        ...payload,
        // A late connection can miss game:round-start, so include the
        // immutable settings necessary to reconstruct the current round.
        map: { srcName: engine.mode.mapCode, name: engine.mode.mapCode },
        roundTime: engine.mode.roundTime
    };
}

/*
    Submits the senders guess
    After all players have guessed, it stops the timer and ends the guessing phase
*/
async function submitGuess(gameId, userId, guess) {
    const engine = GameManager.get(gameId);
    if (!engine) throw new ValidationError("Game not active");

    // If party requires waiting for first guess, and the round hasn't started timing yet,
    // start the timer and set the round.startedAt now so player timing is correct.
    if (engine.partyId) {
        const party = await PartyManager.getById(engine.partyId);
        if (party && party.settings && party.settings.waitForFirstGuess) {
            if (!engine.round || !engine.round.startedAt) {
                if (engine.round) engine.round.startedAt = Date.now();
        startTimerForRound(gameId, engine);
            }
        }
    }

    engine.submitGuess(userId, guess);

    if (engine.didAllPlayersGuess()) {
        stopRoundTimer(gameId);
        if (engine.round) engine.round.timerEndsAt = null;

        engine.endGuessing();
        await sendGuessEndPayload(gameId, engine);
    } else if (typeof engine.mode.getOnGuessPayload === "function") {
        await sendOnGuessPayload(gameId, engine, userId);
    }

    await persistSession(gameId, engine);
}

/*
    Ends the current round, which means loading next round and starting the timer
    If the game is finished, it ends it and removes it from the GameManager
*/
async function endRound(gameId, hostId) {
    const engine = GameManager.get(gameId);
    if (!engine) return;

    if (!engine.isHost(hostId)) {
        throw new ValidationError("Only the host can end the round");
    }

    await engine.endRound();
    const io = getIO("/game");

    // If the game is finished, it will end it and remove it from the GameManager
    if (engine.isGameFinished()) {
        await finishGame(gameId, engine);
        return;
    }

    // If the game is not finished, it will generate the next round and start the timer
    await engine.nextRound();

    // Start timer immediately unless party settings require waiting for first guess
    let shouldStartNext = true;
    if (engine.partyId) {
        const party = await PartyManager.getById(engine.partyId);
        if (party && party.settings && party.settings.waitForFirstGuess) {
            shouldStartNext = false;
        }
    }

    if (shouldStartNext) {
        startTimerForRound(gameId, engine);
    }
    await persistSession(gameId, engine);

    // Send the round start payload to all players
    for (const p of engine.players) {
        const payload = withTimerState(
            engine.mode.getRoundStartPayload(engine, String(p.id)),
            engine
        );
        io.to(String(p.id)).emit("game:round-start", payload);
        console.log("Sending round start payload to player:", p.username, "userId:", String(p.id), "payload:", payload);
    }
}

/*
    Callback for the startRoundTimer method in roundTimer.js
    Gets called after the game timer has reached 0s
    
    Calls the endGuessing method which will proceed to end the guessing phase
    In case a player did not submit the guess, it will get the last known marker pos
*/
async function timerEnded(gameId) {
    const engine = GameManager.get(gameId);
    if (!engine) return;

    for (const player of engine.players) {
        const userId = String(player.id);
        if (engine.round.guesses.has(userId)) continue;

        const pos = engine.lastMarkerPositions.get(userId);
        if (!pos) continue;

        engine.submitGuess(userId, pos);
        engine.lastMarkerPositions.delete(userId);
    }

    if (engine.round) engine.round.timerEndsAt = null;
    engine.endGuessing();

    await persistSession(gameId, engine);
    await sendGuessEndPayload(gameId, engine);
};

// Sends the round info to each one of the players (scores, distances, etc...)
async function sendGuessEndPayload(gameId, engine) {
    const io = getIO("/game");
    engine.players.forEach(player => {
        const userId = String(player.id);
        const payload = engine.mode.getGuessEndPayload(
            engine,
            userId
        );

        io.to(userId).emit(
            "game:guessing-over",
            payload
        );
    });
}

async function sendOnGuessPayload(gameId, engine, userId) {
    const io = getIO("/game");
    const payload = engine.mode.getOnGuessPayload(
        engine,
        userId
    );

    io.to(gameId).emit(
        "game:on-guess",
        payload
    );
}

// Saves a GameEngine instance to its corresponding session in the DB
async function persistSession(gameId, engine, finished = false) {
    const round = engine.round ? engine.round.toJSON() : null;
    const rounds = engine.rounds.map(r => r?.toJSON?.() ?? r);

    const players = engine.players.map(p => ({
        id: String(p.id),
        username: p.username,
        color: p.color,
        score: p.score ?? 0,
        streak: p.streak ?? 0,
        totalTime: p.totalTime ?? 0,
        totalDistance: p.totalDistance ?? null,
        lastDistance: p.lastDistance ?? null,
        guessedRounds: p.guessedRounds ?? 0,
        connected: p.connected ?? false
    }));

    await gameSessionRepository.updateByGameId(gameId, {
        round,
        rounds,
        roundIndex: engine.roundIndex,
        state: engine.getState(),
        lastMarkerPositions: Object.fromEntries(engine.lastMarkerPositions),
        maxDistance: engine.mode.maxDistance,
        players,
        ...(finished && { finishedAt: new Date() })
    });
};

/*
    Sets the player online status flag to the passed value (connected)
    If there are no players left, it will automaticly finish the game and remove it from the GameManager
*/
async function setPlayerConnected(userId, gameId, connected = true) {
    const engine = GameManager.get(gameId);
    if (!engine) return false;

    const player = engine.getPlayer(userId);
    if (!player) return false;

    player.connected = connected;

    const stillConnected = engine.getConnectedPlayers();

    if (stillConnected.length === 0) {
        console.log("Game empty, marking as idle. gameId: " + gameId);

        // Only an active guessing phase can be paused. Previously this
        // overwrote `all_guessed`/reveal with `idle`; reconnecting then
        // incorrectly restored an in-round screen and Space could not advance.
        if (engine.getState() === GameState.IN_ROUND) {
            if (engine.round?.timerEndsAt) {
                engine.round.timerPausedRemaining = Math.max(0, Math.ceil(
                    (new Date(engine.round.timerEndsAt).getTime() - Date.now()) / 1000
                ));
                engine.round.timerEndsAt = null;
            }
            stopRoundTimer(gameId);
            engine.lastActiveAt = Date.now();
            engine.setIdle(true);
        }

        await persistSession(gameId, engine);
        return;
    } else {
        engine.lastActiveAt = null;

        // Resume only a phase we deliberately paused above. Do not transform
        // reveal, transition, or final phases while a player reconnects.
        if (engine.getState() === GameState.IDLE) engine.setIdle(false);

        if (connected && engine.round?.timerPausedRemaining != null) {
            startTimerForRound(gameId, engine);
        }

        await persistSession(gameId, engine);
    }

    const io = getIO("/game");
    io.to(String(gameId)).emit("player:connection-changed", {
        userId: String(userId),
        connected
    });

    return true;
}

async function finishGame(gameId, engine) {
    const io = getIO("/game");
    const payload = engine.mode.getGameEndPayload(engine);

    io.to(String(gameId)).emit(
        "game:end",
        payload
    );

    await persistSession(gameId, engine, true);
    for (const p of engine.players) {
        await statsService.updatePlayerStats(
            p.id,
            p,
            engine.mode,
            engine.mode.mapId,
            engine.mode.mapCode
        );
    }

    /*
        Save a game result for every player
        Used for leaderboards
    */
    await statsService.createGameResult(engine, engine.mode.mapCode);
}

/*
    Calculates and updates the player stats like the xp, per-country avrage and highest score, games played, etc...
    Usually gets called after the game finishes
*/
async function updatePlayerStats(userId, score, maxRounds, mapId, mapCode) {
    try {
        const stats = await userStatsRepository.findByUserId(userId);
        if (!stats) return;

        // XP
        stats.xp += Math.floor(score);
        while (stats.xp >= getXpForLevel(stats.level)) {
            stats.xp -= getXpForLevel(stats.level);
            stats.level++;
        }

        // Map stats
        const current = stats.countryStats.get(mapCode);
        if (!current) {
            stats.countryStats.set(mapCode, {
                mapId,
                averageScore: score,
                highestScore: score
            });
        } else {
            stats.countryStats.set(mapCode, {
                mapId,
                averageScore: (current.averageScore + score) / 2,
                highestScore: Math.max(current.highestScore, score)
            });
        }

        // Global stats
        stats.gamesPlayed += 1;
        stats.totalScore = (stats.totalScore ?? 0) + score;
        stats.maxScore = Math.max(stats.maxScore ?? 0, score);
        stats.averageScore = Math.round(stats.totalScore / stats.gamesPlayed);

        // Accuracy
        const maxTotal = maxRounds * 5000;
        const accuracyPercent = Math.min(score / maxTotal, 1);
        const prevAccuracy = stats.accuracy ?? 0;

        stats.accuracy = Math.round(
            (((prevAccuracy * (stats.gamesPlayed - 1)) + accuracyPercent) / stats.gamesPlayed) * 100
        ) / 100;

        stats.lastUpdated = new Date();

        await userStatsRepository.save(stats);
        console.log("Stats saved for user:", userId);
    } catch (err) {
        console.error("Updating player stats failed:", err);
    }
}

async function handlePlayerConnection(gameId, userId, socket) {
    const engine = GameManager.get(gameId);

    // Is trying to reconnect
    if (engine.getPlayer(String(userId)) && !engine.getPlayer(String(userId)).connected) {
        await attachPlayerToGame(userId, gameId);
        await setPlayerConnected(userId, gameId, true);
        await reconnectPlayer(userId, gameId, socket);
    }
}

async function reconnectPlayer(userId, gameId, socket) {
    const engine = GameManager.get(gameId);
    const player = engine.getPlayer(String(userId));
    if (!engine || !player) return;
    if (!engine.getPlayer(String(userId))) return;

    // game:get-status is the ordered authoritative snapshot. Do not emit a
    // synthetic round-start here: it would overwrite a reveal/end screen.
    socket?.emit("game:state-ready", { gameId });
}

async function attachPlayerToGame(userId, newGameId) {
    const userAction = await userActionRepository.findByUserId(userId);
    if (!userAction) return;

    const oldGameId = userAction.currentSingleplayerGameId;

    if (oldGameId && oldGameId !== newGameId) {
        const oldGame = GameManager.get(oldGameId);

        if (oldGame) {
            console.log("Removing user from previous game");

            await setPlayerConnected(userId, oldGameId, false);
            oldGame.removePlayer(userId);

            if (oldGame.isEmpty()) {
                oldGame.lastActiveAt = Date.now();
                oldGame.setIdle(true);
            }

            await persistSession(oldGameId, oldGame);
        }
    }

    userAction.currentSingleplayerGameId = newGameId;
    await userAction.save();
}

module.exports = {
    generateGameId,
    startGame,
    generateThisAndNextRound,
    getStatus,
    submitGuess,
    endRound,
    timerEnded,
    sendGuessEndPayload,
    sendOnGuessPayload,
    persistSession,
    setPlayerConnected,
    updatePlayerStats,
    handlePlayerConnection,
    reconnectPlayer,
    attachPlayerToGame
};
