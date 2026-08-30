const partyService = require('../services/party.service');
const { sendError } = require('./response.controller');

async function create(req, res) {
  try {
    res.json(await partyService.createParty(req.user.userId));
  } catch (error) {
    sendError(res, error);
  }
}

async function end(req, res) {
  try {
    await partyService.endParty(req.user.userId);
    res.json({ message: 'Party ended' });
  } catch (error) {
    sendError(res, error);
  }
}

async function join(req, res) {
  try {
    res.json(await partyService.joinParty(req.user.userId, req.body.code));
  } catch (error) {
    sendError(res, error);
  }
}

async function leave(req, res) {
  try {
    await partyService.leaveParty(req.user.userId);
    res.json({ success: true });
  } catch (error) {
    sendError(res, error);
  }
}

async function start(req, res) {
  try {
    res.json(await partyService.startPartyGame(req.user.userId, req.params.partyId));
  } catch (error) {
    sendError(res, error);
  }
}

async function swapPlayer(req, res) {
  try {
    res.json(await partyService.swapPlayer(req.user.userId, req.params.partyId, req.body.userId));
  } catch (error) {
    sendError(res, error);
  }
}

async function kickPlayer(req, res) {
  try {
    res.json(await partyService.kickPlayer(req.user.userId, req.params.partyId, req.body.userId));
  } catch (error) {
    sendError(res, error);
  }
}

async function kickOffline(req, res) {
  try {
    res.json(await partyService.kickOfflinePlayers(req.user.userId, req.params.partyId));
  } catch (error) {
    sendError(res, error);
  }
}

async function terminateGame(req, res) {
  try {
    res.json(await partyService.terminateGame(req.user.userId, req.params.partyId));
  } catch (error) {
    sendError(res, error);
  }
}

async function settings(req, res) {
  try {
    res.json(await partyService.updateSettings(req.user.userId, req.params.partyId, req.body));
  } catch (error) {
    sendError(res, error);
  }
}

async function show(req, res) {
  try {
    res.json(await partyService.getParty(req.user.userId, req.params.partyId));
  } catch (error) {
    sendError(res, error);
  }
}

module.exports = {
  create,
  end,
  join,
  leave,
  start,
  swapPlayer,
  kickPlayer,
  kickOffline,
  terminateGame,
  settings,
  show
};
