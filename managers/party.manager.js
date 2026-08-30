// managers/PartyManager.js
const Party = require("../game/Party");

class PartyManager {
    constructor() {
        this.parties = new Map();
    }

    // Add party to memory
    add(party) {
        if (this.parties.has(party.code)) {
            console.warn(`Party ${party.code} already exists. Overwriting.`);
        }

        console.log(`Adding party ${party.code} to memory`);
        this.parties.set(party.code, party);
    }

    // Get party (memory first, DB fallback)
    async getByCode(code) {
        if (this.parties.has(code)) {
            return this.parties.get(code);
        }

        // Load from DB
        const party = await Party.findByCode(code);

        if (!party) return null;

        this.add(party);
        return party;
    }

    async getById(id) {
        // Load from DB
        const party = await Party.findById(id);

        if (!party) return null;

        this.add(party);
        return party;
    }

    // Remove party
    remove(code) {
        this.parties.delete(code);
    }

    has(code) {
        return this.parties.has(code);
    }

    cleanupInactive() {
        for (const [code, party] of this.parties) {
            if (
                party.status === "finished" ||
                party.players.length === 0
            ) {
                console.log(`Cleaning up party ${code}`);
                this.remove(code);
            }
        }
    }

    all() {
        return Array.from(this.parties.values());
    }
}

module.exports = new PartyManager();