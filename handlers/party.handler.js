const { getIO } = require("../socket");
const PartyManager = require("../managers/party.manager");
const { socketEventHandler } = require('../utils/socket-error.utils');

// userId -> Set(socketIds)
const onlineUsers = new Map();

// socket.id -> { userId, partyCode }
const socketMeta = new Map();

/*
  Send event to ALL sockets of a user
*/
function sendToUser(userId, event, data = {}) {
  const io = getIO("/party");
  const sockets = onlineUsers.get(userId.toString());

  if (!sockets) return;

  sockets.forEach((socketId) => {
    io.to(socketId).emit(event, data);
  });
}

/*
  Remove user from a party room (all their sockets)
*/
function removeUserFromPartyRoom(userId, partyCode) {
  const io = getIO("/party");
  const sockets = onlineUsers.get(userId.toString());

  if (!sockets) return;

  sockets.forEach((socketId) => {
    const socket = io.sockets.get(socketId);
    if (socket) {
      socket.leave(partyCode);
    }
  });
}

function kickAllFromParty(partyCode) {
  const io = getIO("/party");

  io.to(partyCode).emit("party-disbanded");
  io.in(partyCode).socketsLeave(partyCode);
}

/*
  Kick user: notify + remove from room
*/
function kickUserFromParty(userId, username, partyCode) {
  sendToUser(userId, "player-kicked");
  removeUserFromPartyRoom(userId, partyCode);

  const io = getIO("/party");

  // Notify other clients
  io.to(partyCode).emit("player-left", {
    userId,
    username
  });
}

/*
  Register socket events
*/
function registerPartyEvents() {
  console.log("Registered party socket events...");
  
  const io = getIO("/party");
  io.on("connection", (socket) => {
    console.log("Party user connected:", socket.id);

    socket.on("join-party", socketEventHandler(async ({ partyCode, userId }) => {
      if (!partyCode || !userId) return;

      const party = await PartyManager.getByCode(partyCode);
      if (!party) return;

      const userKey = userId.toString();

      // Add socket to user set
      if (!onlineUsers.has(userKey)) {
        onlineUsers.set(userKey, new Set());
      }

      onlineUsers.get(userKey).add(socket.id);
      socketMeta.set(socket.id, { userId, partyCode });

      socket.join(partyCode);

      // If first connection → mark online
      if (onlineUsers.get(userKey).size === 1) {
        party.setOnline(userId, true);

        io.to(partyCode).emit("player-status", {
          userId,
          status: "online",
        });
      }

      console.log(`User ${userId} joined party ${partyCode}`);
    }));

    socket.on("disconnect", socketEventHandler(async () => {
      const meta = socketMeta.get(socket.id);
      if (!meta) return;

      const { userId, partyCode } = meta;
      const userKey = userId.toString();

      socketMeta.delete(socket.id);

      if (!onlineUsers.has(userKey)) return;

      const sockets = onlineUsers.get(userKey);
      sockets.delete(socket.id);

      // If no sockets left → fully offline
      if (sockets.size === 0) {
        onlineUsers.delete(userKey);

        const party = await PartyManager.getByCode(partyCode);
        if (party) {
          party.setOnline(userId, false);

          io.to(partyCode).emit("player-status", {
            userId,
            status: "offline",
          });
        }

        console.log(`User ${userId} fully disconnected`);
      }
    }));
  });
}

module.exports = {
  registerPartyEvents,
  sendToUser,
  kickUserFromParty,
  kickAllFromParty,
};