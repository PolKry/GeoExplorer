// Saves all of the game engines to the memory and maps a gameId as a key
class GameManager {
    constructor() {
        this.engines = new Map();
    }

    // Adds a game engine to the map
    add(gameId, engine) {
        this.engines.set(gameId, engine);
    }

    // Gets a game engine
    get(gameId) {
        return this.engines.get(gameId);
    }

    // Removes a game engine with the same gameId
    remove(gameId) {
        this.engines.delete(gameId);
    }

    // Checks if a game engine with the same gameId exists
    has(gameId) {
        return this.engines.has(gameId);
    }
}

module.exports = new GameManager();