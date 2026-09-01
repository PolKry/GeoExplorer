// game/getGameClass.js
const PointsMode = require("./modes/PointsMode");
const CountryMode = require("./modes/CountryStreakMode");
const FFAMode = require("./modes/FFAMode");
const TeamsMode = require("./modes/TeamMode");
const { ValidationError } = require("../utils/app-error.utils");

// Map mode string => class
const modes = {
    "points": PointsMode,
    "country": CountryMode,
    "ffa": FFAMode,
    "teams": TeamsMode
};

/**
 * Returns the class for a given mode string.
 * @param {string} mode 
 * @returns {class} Game mode class
 */
function getGameClass(mode) {
    const GameClass = modes[mode];
    if (!GameClass) throw new ValidationError(`Unknown game mode: ${mode}`);
    return GameClass;
}

/**
 * Returns the mode string for a given class instance or class.
 * @param {object|class} modeInstance
 * @returns {string}
 */
function getModeFromClass(modeInstance) {
    const ModeClass = typeof modeInstance === "function"
        ? modeInstance
        : modeInstance.constructor;

    for (const [mode, cls] of Object.entries(modes)) {
        if (cls === ModeClass) return mode;
    }

    throw new ValidationError("Unknown game mode class");
}

module.exports = {
    getGameClass,
    getModeFromClass
};