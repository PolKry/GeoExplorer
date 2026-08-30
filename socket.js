let io;

function init(server) {
  const { Server } = require("socket.io");
  io = new Server(server, {
    cors: { origin: "*" }, // adjust for production
  });

  // Create isolated namespaces
  io.of("/game");  // for game timers
  io.of("/party"); // for party chat/status

  return io;
}

function getIO(namespace = "/") {
  if (!io) throw new Error("Socket.io not initialized!");
  return io.of(namespace); // returns the namespace instance
}

module.exports = { init, getIO };