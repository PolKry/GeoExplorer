const COLORS = [
    "#3cb44b", "#ffe119", "#4363d8",
    "#f58231", "#911eb4", "#46f0f0",
    "#f032e6"
];

function hashString(str) {
    let hash = 0;
    str = String(str);

    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
    }

    return Math.abs(hash);
}

function getPlayerColor(playerId, isHost = false) {
    if (isHost) return "#FFD700"; // gold

    const index = hashString(playerId) % COLORS.length;
    return COLORS[index];
}

module.exports = { getPlayerColor };