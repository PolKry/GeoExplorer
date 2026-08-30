const socket = require('../socket');
const PartyManager = require('../managers/party.manager');
const Party = require('../game/Party');
const gameController = require('../controllers/game.controller');
const gameService = require('./game.service');
const gameManager = require('../managers/game.manager');
const { kickUserFromParty, kickAllFromParty } = require('../handlers/party.handler');
const { stopRoundTimer } = require('../handlers/timer.handler');
const userRepository = require('../repositories/user.repository');
const userProfileRepository = require('../repositories/user-profile.repository');
const partyRepository = require('../repositories/party.repository');

function validatePartyId(partyId) {
  if (!partyId || typeof partyId !== 'string' || partyId.length < 5) {
    const error = new Error('Invalid or missing party code.');
    error.status = 400;
    throw error;
  }
}

async function getUserOrThrow(userId) {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  return user;
}

async function getProfileOrThrow(userId) {
  const profile = await userProfileRepository.findByUserId(userId);
  if (!profile) {
    const error = new Error('User profile not found');
    error.status = 404;
    throw error;
  }
  return profile;
}

async function getPartyOrThrow(partyId) {
  const party = await PartyManager.getByCode(partyId);
  if (!party) {
    const error = new Error('Party not found.');
    error.status = 404;
    throw error;
  }
  return party;
}

async function createParty(userId) {
  const user = await getUserOrThrow(userId);
  const userProfile = await getProfileOrThrow(userId);

  if (userProfile.partyCode) {
    const existingParty = await PartyManager.getByCode(userProfile.partyCode);
    if (existingParty) {
      if (existingParty.isHost(userId)) return existingParty;
      existingParty.removePlayer(userId);
      kickUserFromParty(userId, user.username, userProfile.partyCode);
    }

    userProfile.partyCode = null;
    await userProfile.save();
  }

  const party = await Party.create(user);
  PartyManager.add(party);

  userProfile.partyCode = party.code;
  await userProfile.save();

  return party;
}

async function endParty(userId) {
  const userProfile = await getProfileOrThrow(userId);
  if (!userProfile.partyCode) {
    const error = new Error('No active party');
    error.status = 400;
    throw error;
  }

  const party = await getPartyOrThrow(userProfile.partyCode);
  kickAllFromParty(party.code);

  await partyRepository.deletePartyByCode(userProfile.partyCode);
  PartyManager.remove(userProfile.partyCode);
  await userProfileRepository.updateMany({ partyCode: userProfile.partyCode }, { $set: { partyCode: null } });
}

async function joinParty(userId, partyId) {
  const io = socket.getIO('/party');
  const user = await getUserOrThrow(userId);
  const userProfile = await getProfileOrThrow(userId);
  const oldPartyCode = userProfile.partyCode;

  if (oldPartyCode) {
    const oldParty = await PartyManager.getByCode(oldPartyCode);
    if (oldParty) {
      oldParty.removePlayer(userId);
      kickUserFromParty(userId, user.username, oldPartyCode);
    }
  }

  const party = await getPartyOrThrow(partyId);
  const player = party.getPlayer(userId);

  if (player) {
    return { message: 'Already in party' };
  }

  party.addPlayer(user);

  if (party.settings.mode === 'teams') {
    party.setTeam(userId, party.getTeamFromParty());
  }

  io.to(partyId).emit('player-joined', {
    userId,
    username: user.username,
    team: party.getPlayer(userId).team,
    color: party.getPlayer(userId).color
  });

  userProfile.partyCode = partyId;
  await userProfile.save();

  return { message: 'Joined successfully', code: partyId };
}

async function leaveParty(userId) {
  const user = await getUserOrThrow(userId);
  const userProfile = await getProfileOrThrow(userId);

  if (!userProfile.partyCode) {
    const error = new Error('No active party');
    error.status = 400;
    throw error;
  }

  const party = await getPartyOrThrow(userProfile.partyCode);
  if (party.isHost(userId)) {
    const error = new Error('Host can not leave the party');
    error.status = 400;
    throw error;
  }

  userProfile.partyCode = null;
  await userProfile.save();

  party.removePlayer(userId);
  kickUserFromParty(userId, user.username, party.code);
}

async function startPartyGame(userId, partyId) {
  const io = socket.getIO('/party');
  const party = await getPartyOrThrow(partyId);

  if (!party.isHost(userId)) {
    const error = new Error('Only host can start the game');
    error.status = 403;
    throw error;
  }

  if (party.isPlaying()) {
    const error = new Error('This party already has an ongoing game');
    error.status = 403;
    throw error;
  }

  const gameData = await gameController.startGameForParty(party);
  await party.startGame(userId, gameData.gameId);
  io.to(party.code).emit('party:game-started', gameData.gameId);

  return { success: true, gameId: gameData.gameId };
}

async function swapPlayer(userId, partyId, swapUserId) {
  validatePartyId(partyId);
  const io = socket.getIO('/party');
  const party = await getPartyOrThrow(partyId);

  if (party.host.toString() !== userId) {
    const error = new Error('Only host can swap people!');
    error.status = 403;
    throw error;
  }

  if (party.settings.mode === 'teams') {
    party.players.forEach((player) => {
      if (player.user.toString() === swapUserId) {
        player.team = player.team === 'red' ? 'blue' : 'red';
      }
    });
  } else if (party.settings.mode === 'ffa') {
    const error = new Error('Cannot swap players in FFA mode');
    error.status = 403;
    throw error;
  }

  await party.persist();
  io.to(party.code).emit('party-updated', party);
  return party;
}

async function kickPlayer(userId, partyId, kickedUserId) {
  validatePartyId(partyId);
  await getUserOrThrow(userId);
  const io = socket.getIO('/party');
  const party = await getPartyOrThrow(partyId);

  if (!party.isHost(userId)) {
    const error = new Error('Only host can kick people!');
    error.status = 403;
    throw error;
  }

  if (party.isHost(kickedUserId)) {
    const error = new Error('Host can not be kicked!');
    error.status = 403;
    throw error;
  }

  const kickedUser = party.getPlayer(kickedUserId);
  if (!kickedUser) {
    const error = new Error('Kicked user could not be found');
    error.status = 404;
    throw error;
  }

  party.removePlayer(kickedUserId);
  await userProfileRepository.findOneAndUpdate({ userId: kickedUserId }, { partyCode: null });
  kickUserFromParty(kickedUserId, kickedUser.username, party.code);
  io.to(party.code).emit('party-updated', party);
  return party;
}

async function kickOfflinePlayers(userId, partyId) {
  validatePartyId(partyId);
  await getUserOrThrow(userId);
  const io = socket.getIO('/party');
  const party = await getPartyOrThrow(partyId);

  if (!party.isHost(userId)) {
    const error = new Error('Only host can kick players!');
    error.status = 403;
    throw error;
  }

  const offlinePlayers = party.getOfflinePlayers();
  if (offlinePlayers.length === 0) return party;

  for (const player of offlinePlayers) {
    await party.removePlayer(player.user);
  }

  const offlineUserIds = offlinePlayers.map((player) => player.user.toString());
  await userProfileRepository.updateMany({ userId: offlineUserIds }, { partyCode: null });

  io.to(party.code).emit('players-removed', {
    party: party.code,
    removed: offlineUserIds
  });
  io.to(party.code).emit('party-updated', party);

  return party;
}

async function terminateGame(userId, partyId) {
  validatePartyId(partyId);
  await getUserOrThrow(userId);
  const partyIo = socket.getIO('/party');
  const party = await getPartyOrThrow(partyId);

  if (!party.isHost(userId)) {
    const error = new Error('Only host can kick players!');
    error.status = 403;
    throw error;
  }

  if (!party.isPlaying()) {
    const error = new Error('No ongoing game to terminate!');
    error.status = 400;
    throw error;
  }

  const gameId = party.getGameId();
  socket.getIO('/game').to(gameId).emit('game:terminated');
  stopRoundTimer(gameId);

  party.clearGame();
  await party.persist();

  gameManager.remove(gameId);
  await partyRepository.deleteGameSession(gameId);

  partyIo.to(party.code).emit('party-updated', party);
  return party;
}

async function updateSettings(userId, partyId, settings) {
  validatePartyId(partyId);
  const io = socket.getIO('/party');
  const party = await getPartyOrThrow(partyId);
  
  if (party.host.toString() !== userId) {
    const error = new Error('Only host can change settings');
    error.status = 403;
    throw error;
  }

  if (settings.mode === 'teams') {
    party.players.forEach((player) => {
      player.team = party.getTeamFromParty();
    });
  } else if (settings.mode === 'ffa') {
    party.players.forEach((player) => {
      player.team = null;
    });
  }

  party.settings = settings;
  await party.persist();
  io.to(party.code).emit('party-updated', party);
  return party;
}

async function getParty(userId, partyId) {
  const party = await getPartyOrThrow(partyId);
  if (!party.getPlayer(userId)) {
    const error = new Error('You are not a member of this party.');
    error.status = 403;
    throw error;
  }

  if (party.isPlaying()) {
    const gameId = party.getGameId();
    if (!gameManager.has(gameId)) {
      await party.clearGame();
      await party.persist();
    }
  }

  if (false) {
    const gameId = party.getGameId();
    gameService.reconnectPlayer(userId, gameId);
    return { gameId };
  }

  return { party };
}

module.exports = {
  createParty,
  endParty,
  joinParty,
  leaveParty,
  startPartyGame,
  swapPlayer,
  kickPlayer,
  kickOfflinePlayers,
  terminateGame,
  updateSettings,
  getParty
};
