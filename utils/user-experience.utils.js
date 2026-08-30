// utils/userExperienceUtils.js

const base = 35000;    // higher starting XP requirement per level
const scale = 800;    // higher multiplier to increase XP needed faster
const exponent = 2.8; // steeper growth

function getXpForLevel(level) {
    return Math.floor(base + scale * Math.pow(level, exponent));
}

module.exports = {
    getXpForLevel
};