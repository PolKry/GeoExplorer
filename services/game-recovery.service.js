const GameEngine = require("../game/GameEngine");
const Party = require("../game/Party");
const GameManager = require("../managers/game.manager");
const PartyManager = require("../managers/party.manager");
const gameSessionRepository = require("../repositories/game-session.repository");
const partyRepository = require("../repositories/party.repository");

const { startRoundTimer } = require("../handlers/timer.handler");

/*
    Recover all active parties
*/
async function recoverParties() {
    console.log("Recovering parties...");

    const partyDocs = await partyRepository.findActiveParties();

    for (const doc of partyDocs) {
        const party = new Party(doc);
        PartyManager.add(party);

        console.log(`Recovered party: ${party.code}`);
    }

    console.log(`Recovered ${partyDocs.length} parties`);
}

/*
    Recover all active games
*/
async function recoverActiveGames() {
    console.log("Recovering active games...");

    const sessions = await gameSessionRepository.findActive();

    for (const gameDoc of sessions) {
        const engine = GameEngine.loadFromSession(gameDoc);

        GameManager.add(gameDoc.gameId, engine);

        if (engine.getState() === "in_game") {
            // Respect party setting: if party requires waiting for first guess and
            // the saved session has no round.startedAt, do not start the timer yet.
            let shouldStart = true;
            if (gameDoc.partyId) {
                const party = await PartyManager.getById(gameDoc.partyId).catch(() => null);
                if (party && party.settings && party.settings.waitForFirstGuess) {
                    if (!gameDoc.round || !gameDoc.round.startedAt) {
                        shouldStart = false;
                    }
                }
            }

            if (shouldStart) {
                startRoundTimer(gameDoc.gameId, gameDoc.settings.roundTime);
            }
        }

        console.log(`Recovered game: ${gameDoc.gameId}`);
    }

    console.log(`Recovered ${sessions.length} games`);
}

module.exports = {
    recoverParties,
    recoverActiveGames
};
