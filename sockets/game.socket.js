const gameService = require('../services/game.service');
const GameSession = require("../models/game-session.model");
const GameManager = require("../managers/game.manager");
const { socketAsyncHandler, socketEventHandler } = require('../utils/socket-error.utils');

const { getIO } = require("../socket");

function registerGameEvents() {
    console.log("Registered game socket events...");

    const io = getIO("/game");
    io.on('connection', (socket) => {
        const userId = socket.user.userId.toString();

        console.log('User connected:', socket.id, 'userId:', userId);

        // Join the user room (for private events like round-ready)
        socket.join(userId);

        // --- GAME EVENTS ---
        socket.on('game:get-status', socketAsyncHandler(async ({ gameId }, callback) => {
            const gameData = await gameService.getStatus(gameId, userId);
            callback(gameData);
        }));

        socket.on('game:submit-guess', socketEventHandler(async (data) => {
            await gameService.submitGuess(
                data.gameId,
                userId,
                data
            );
        }));

        socket.on("game:update-marker", socketEventHandler(async ({ gameId, position }) => {
            const engine = GameManager.get(gameId);

            // Only store valid numbers
            if (position && !isNaN(position.lat) && !isNaN(position.lng)) {
                engine.updateMarkerPosition(socket.user.userId, {
                    lat: Number(position.lat),
                    lng: Number(position.lng)
                });
            }
        }));

        socket.on('game:end-round', socketEventHandler(async ({ gameId }) => {
            await gameService.endRound(gameId, userId);
        }));

        // --- JOIN GAME ROOM ---
        socket.on("game:join", socketEventHandler(async (gameId) => {
            socket.join(gameId);

            if (!socket.data.games) socket.data.games = new Set();
            socket.data.games.add(gameId);

            await waitForEngine(gameId);
            await gameService.handlePlayerConnection(gameId, userId, socket);

            console.log(`Socket ${socket.id} joined game room ${gameId}`);
        }));

        socket.on("disconnect", socketEventHandler(async () => {
            console.log("User disconnected:", socket.id);

            if (!socket.data.games) return;

            for (const gameId of socket.data.games) {
                try {
                    // A reload can establish its replacement socket before the
                    // old one disconnects. Do not mark that player offline
                    // while another socket is still in their private room.
                    if (io.in(userId).size > 0) continue;
                    await gameService.setPlayerConnected(userId, gameId, false);
                    console.log("Marked offline:", gameId, userId);
                } catch (err) {
                    console.error("Failed to mark player offline:", err);
                }
            }
        }));

        function waitForEngine(gameId, timeoutMs = 5000) {
            try {
                return new Promise((resolve, reject) => {
                    const started = Date.now();

                    const interval = setInterval(() => {
                        const engine = GameManager.get(gameId);

                        if (engine) {
                            clearInterval(interval);
                            resolve(engine);
                            return;
                        }

                        if (Date.now() - started >= timeoutMs) {
                            clearInterval(interval);
                        }
                    }, 100);
                });
            } catch (ex) {
                console.warn(ex);
            }
        }
    });
}

module.exports = {
    registerGameEvents
};
