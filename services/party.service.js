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
const { ValidationError, NotFoundError, ForbiddenError } = require('../utils/app-error.utils');

function validatePartyId(partyId) {
  if (!partyId || typeof partyId !== 'string' || partyId.length < 5) {
    throw new ValidationError('Invalid or missing party code.');
  }
}

async function getUserOrThrow(userId) {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
}

async function getProfileOrThrow(userId) {
  const profile = await userProfileRepository.findByUserId(userId);
  if (!profile) {
    throw new NotFoundError('User profile not found');
  }
  return profile;
}

async function getPartyOrThrow(partyId) {
  const party = await PartyManager.getByCode(partyId);
  if (!party) {
    throw new NotFoundError('Party not found.');
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
    throw new ValidationError('No active party');
  }
  
  const party = await getPartyOrThrow(userProfile.partyCode);
  kickAllFromParty(party.code);
  
  await partyRepository.deletePartyByCode(userProfile.partyCode);
  PartyManager.remove(userProfile.partyCode);
  await userProfileRepository.updateMany({ partyCode: userProfile.partyCode }, { $set: { partyCode: null } });
  
  console.log("Ending party for user:", userId, "with party code:", userProfile.partyCode);
  return { message: 'Party ended successfully' };
}

async function joinParty(userId, partyId) {
  const io = socket.getIO('/party');
  const user = await getUserOrThrow(userId);
  const userProfile = await getProfileOrThrow(userId);
  const oldPartyCode = userProfile.partyCode;
  const party = await getPartyOrThrow(partyId);

  // Joining the same party again happens on dashboard reloads and socket
  // reconnects. It must be a no-op: removing a host here could promote a
  // guest to host before the original host is added back.
  if (party.getPlayer(userId)) {
    if (userProfile.partyCode !== party.code) {
      userProfile.partyCode = party.code;
      await userProfile.save();
    }
    return { message: 'Already in party', party };
  }

  if (oldPartyCode && oldPartyCode !== party.code) {
    const oldParty = await PartyManager.getByCode(oldPartyCode);
    if (oldParty) {
      oldParty.removePlayer(userId);
      kickUserFromParty(userId, user.username, oldPartyCode);
    }
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

  return { message: 'Joined successfully', party };
}

async function leaveParty(userId) {
  const user = await getUserOrThrow(userId);
  const userProfile = await getProfileOrThrow(userId);

  if (!userProfile.partyCode) {
    throw new ValidationError('No active party');
  }

  const party = await getPartyOrThrow(userProfile.partyCode);
  if (party.isHost(userId)) {
    throw new ValidationError('Host can not leave the party');
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
    throw new ForbiddenError('Only host can start the game');
  }

  if (party.players.length < 2) {
    throw new ValidationError('At least two players are required to start a party game');
  }

  if (party.isPlaying()) {
    throw new ForbiddenError('This party already has an ongoing game');
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
    throw new ForbiddenError('Only host can swap people!');
  }

  if (party.settings.mode === 'teams') {
    party.players.forEach((player) => {
      if (player.user.toString() === swapUserId) {
        player.team = player.team === 'red' ? 'blue' : 'red';
      }
    });
  } else if (party.settings.mode === 'ffa') {
    throw new ForbiddenError('Cannot swap players in FFA mode');
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
    throw new ForbiddenError('Only host can kick people!');
  }

  if (party.isHost(kickedUserId)) {
    throw new ForbiddenError('Host can not be kicked!');
  }

  const kickedUser = party.getPlayer(kickedUserId);
  if (!kickedUser) {
    throw new NotFoundError('Kicked user could not be found');
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
    throw new ForbiddenError('Only host can kick players!');
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
    throw new ForbiddenError('Only host can kick players!');
  }

  if (!party.isPlaying()) {
    throw new ValidationError('No ongoing game to terminate!');
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
    throw new ForbiddenError('Only host can change settings');
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
    throw new ForbiddenError('You are not a member of this party.');
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
