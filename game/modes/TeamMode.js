const PointsMode = require('./PointsMode');

class TeamMode extends PointsMode {
    onRoundEnd(engine) {
        for (const team of engine.teams) {
            team.score = team.players.reduce((sum, p) => sum + p.score, 0);
        }
    }

    onGameEnd(engine) {
        engine.winner = engine.teams.sort((a, b) => b.score - a.score)[0];
    }
}

module.exports = TeamMode;