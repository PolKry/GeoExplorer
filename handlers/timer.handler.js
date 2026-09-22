const { getIO } = require("../socket");
const timers = new Map(); // gameId -> { interval, deadline }

function startRoundTimer(gameId, duration, onEndCallback, deadline = null) {
    if (duration === Infinity) return;

    // If already exists, don't overwrite (prevents accidental reset)
    if (timers.has(gameId)) return;

    createTimer(gameId, deadline || new Date(Date.now() + duration * 1000), onEndCallback);
}

function resumeRoundTimer(gameId, onEndCallback) {
    const existing = timers.get(gameId);
    if (!existing) return;

    // Prevent duplicate intervals
    if (existing.interval) return;

    createTimer(gameId, existing.deadline, onEndCallback);
}

function createTimer(gameId, deadline, onEndCallback) {
    const io = getIO("/game");
    const endsAt = new Date(deadline).getTime();
    const remaining = () => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));

    console.log(`Running timer for game ${gameId}: ${remaining()}s`);

    io.to(gameId).emit("timer:start", { remaining: remaining(), deadline: endsAt, serverNow: Date.now() });

    const interval = setInterval(() => {
        const timeLeft = remaining();

        io.to(gameId).emit("timer:tick", { remaining: timeLeft, deadline: endsAt, serverNow: Date.now() });

        if (timeLeft <= 0) {
            clearInterval(interval);
            timers.delete(gameId);

            io.to(gameId).emit("timer:end");

            if (onEndCallback) onEndCallback(gameId);
        }
    }, 250);

    timers.set(gameId, { interval, deadline: endsAt });
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
                const { deadline } = timers.get(gameId);

                // Send current state only (DO NOT restart timer)
                socket.emit("timer:start", {
                    remaining: Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
                    deadline,
                    serverNow: Date.now()
                });
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
