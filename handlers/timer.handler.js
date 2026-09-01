const { getIO } = require("../socket");
const timers = new Map(); // gameId -> { interval, remaining }

function startRoundTimer(gameId, duration, onEndCallback) {
    if (duration === Infinity) return;

    const io = getIO("/game");

    // If already exists, don't overwrite (prevents accidental reset)
    if (timers.has(gameId)) return;

    createTimer(gameId, duration, onEndCallback);
}

function resumeRoundTimer(gameId, onEndCallback) {
    const existing = timers.get(gameId);
    if (!existing) return;

    const { remaining } = existing;

    // Prevent duplicate intervals
    if (existing.interval) return;

    createTimer(gameId, remaining, onEndCallback);
}

function createTimer(gameId, duration, onEndCallback) {
    const io = getIO("/game");

    let remaining = duration;

    console.log(`Running timer for game ${gameId}: ${remaining}s`);

    io.to(gameId).emit("timer:start", { remaining });

    const interval = setInterval(() => {
        remaining--;

        io.to(gameId).emit("timer:tick", { remaining });

        if (remaining <= 0) {
            clearInterval(interval);
            timers.delete(gameId);

            io.to(gameId).emit("timer:end");

            if (onEndCallback) onEndCallback(gameId);
        } else {
            timers.set(gameId, { interval, remaining });
        }
    }, 1000);

    timers.set(gameId, { interval, remaining });
}

function stopRoundTimer(gameId) {
    if (timers.has(gameId)) {
        console.log(`Stopped timer for game ${gameId}`);

        clearInterval(timers.get(gameId).interval);
        timers.delete(gameId);
    }
}

function registerTimerEvents() {
    console.log("Registered timer socket events...");

    const io = getIO("/game");
    io.on("connection", (socket) => {
        socket.on("game:join", (gameId) => {
            if (timers.has(gameId)) {
                const { remaining } = timers.get(gameId);

                // Send current state only (DO NOT restart timer)
                socket.emit("timer:start", { remaining });
            }
        });
    });
}

module.exports = {
    registerTimerEvents,
    startRoundTimer,
    resumeRoundTimer,
    stopRoundTimer
};