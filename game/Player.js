class Player {
    constructor(id, username, color = "#ff0000", connected = true, score = 0, streak = 0, team = null) {
        this.id = id;
        this.username = username;
        this.score = score;
        this.streak = streak;
        this.connected = connected;
        this.team = team;
        this.color = color;

        this.totalTime = 0;
        this.guessedRounds = 0;

        this.totalDistance = null;
        this.lastDistance = null;
    }
}

module.exports = Player;